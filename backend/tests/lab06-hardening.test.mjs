// Lab 06 hardening suite: idempotent checkout (sequential + concurrent),
// verified-payment inventory (transactional), cancel flow, admin-gated
// status machine, sync recovery. Requires backend on BASE + Razorpay Test
// keys in ../.env (+ ADMIN_KEY for status tests). Run: npm test
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const BASE = process.env.TEST_BASE || "http://localhost:8000";
const here = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(here, "..", ".env"), "utf8");
const getEnv = (key) => envText.split("\n").map((l) => l.trim()).find((l) => l.startsWith(`${key}=`))?.split("=").slice(1).join("=").trim() || "";
const SECRET = getEnv("RAZORPAY_KEY_SECRET");
const ADMIN_KEY = getEnv("ADMIN_KEY");

let jar = "";
let passed = 0, failed = 0, skipped = 0;
const results = [];
function assert(name, cond, detail = "") {
  if (cond === "skip") { skipped++; results.push(`SKIP ${name} :: ${detail}`); return; }
  if (cond) { passed++; results.push(`PASS ${name}`); }
  else { failed++; results.push(`FAIL ${name} :: ${detail}`); }
}
function capture(res) {
  const sc = res.headers.get("set-cookie");
  if (sc) { const m = sc.match(/token=([^;]*)/); if (m && m[1]) jar = `token=${m[1]}`; }
}
async function req(method, p, body = null, useJar = true, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (useJar && jar) headers["Cookie"] = jar;
  const res = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  capture(res);
  let data = null; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}
const adminHeaders = () => (ADMIN_KEY ? { "x-admin-key": ADMIN_KEY } : {});
const loginAs = async (email, pw) => { jar = ""; await req("POST", "/customers/login", { email, password: pw }, false); };

const ts = Date.now();
const email = `harden_${ts}@test.com`, pw = "harden123";
await req("POST", "/customers/register", { fullName: "Harden", email, password: pw, phone: "9876543210" }, false);
await loginAs(email, pw);

let r = await req("POST", "/products", { name: `HardenProd ${ts}`, description: "h", price: 1200, category: "Books", image: "https://example.com/h.jpg", stock: 20 }, false);
const pid = r.data?.product?._id;
const stockOf = async () => (await req("GET", `/products/${pid}`, null, false)).data?.product?.stock;
await req("POST", `/cart/${pid}`);
const addr = { fullName: "Harden", phone: "9876543210", addressLine1: "9 Test Rd", city: "Pune", state: "MH", pincode: "411001" };

// 1. Sequential duplicate submissions → ONE ShopKart order (idempotent reuse)
const c1 = await req("POST", "/orders/create-payment-order", { shippingAddress: addr });
const gatewayDown = c1.status === 503;
assert("gateway configured (else payment cases skip)", gatewayDown ? "skip" : c1.status === 201, `got ${c1.status}`);
if (!gatewayDown) {
  const c2 = await req("POST", "/orders/create-payment-order", { shippingAddress: addr });
  assert("retry reuses same order (no duplicate)", c2.status === 200 && c2.data?.reused === true && String(c2.data?.shopKartOrderId) === String(c1.data?.shopKartOrderId), `got ${c2.status} ${JSON.stringify(c2.data)}`);

  // 1b. TRUE concurrent duplicates → still one order (unique index backstop)
  const parallel = await Promise.all([1, 2, 3].map(() => req("POST", "/orders/create-payment-order", { shippingAddress: addr })));
  const ids = new Set(parallel.map((x) => String(x.data?.shopKartOrderId || x.status)));
  assert("3 parallel creates → single order", parallel.every((x) => x.status === 200 || x.status === 201) && ids.size === 1, JSON.stringify(parallel.map((x) => [x.status, String(x.data?.shopKartOrderId)])));

  // changed intent (qty 2) → stale pending retired + NEW order
  await req("POST", `/cart/${pid}`);
  const c3 = await req("POST", "/orders/create-payment-order", { shippingAddress: addr });
  assert("changed cart retires stale + mints new", c3.status === 201 && String(c3.data?.shopKartOrderId) !== String(c1.data?.shopKartOrderId) && String(c3.data?.superseded) === String(c1.data?.shopKartOrderId), `got ${c3.status} ${JSON.stringify(c3.data)}`);
  const retired = await req("GET", `/orders/${c1.data?.shopKartOrderId}`);
  assert("retired order is FAILED", retired.data?.order?.paymentStatus === "FAILED", JSON.stringify(retired.data?.order?.paymentStatus));
  const shopId = c3.data?.shopKartOrderId, rpId = c3.data?.razorpayOrderId;

  // 1c. Sync before any capture → no change, still pending
  const sy0 = await req("POST", `/orders/${shopId}/sync`);
  assert("sync with no capture leaves pending", sy0.status === 200 && sy0.data?.paymentStatus === "PENDING", `got ${sy0.status} ${JSON.stringify(sy0.data)}`);

  // 2. Fake signature → 400, cart kept
  await req("POST", "/orders/verify-payment", { shopKartOrderId: shopId, razorpay_order_id: rpId, razorpay_payment_id: "pay_X", razorpay_signature: "00".repeat(32) });
  const afterFake = await req("GET", "/cart");
  assert("fake sig keeps cart", afterFake.data?.cart?.length === 1, JSON.stringify(afterFake.data));

  // 3. Valid verify → PAID + stock decremented (20 → 18 for qty 2)
  const before = await stockOf();
  const payId = `pay_Hard${ts}`;
  const sig = crypto.createHmac("sha256", SECRET).update(`${rpId}|${payId}`).digest("hex");
  const v = await req("POST", "/orders/verify-payment", { shopKartOrderId: shopId, razorpay_order_id: rpId, razorpay_payment_id: payId, razorpay_signature: sig });
  assert("verify PAID/PLACED", v.status === 200 && v.data?.order?.paymentStatus === "PAID", `got ${v.status}`);
  const after = await stockOf();
  assert(`stock decremented ${before}→${after}`, after === before - 2, `before=${before} after=${after}`);
  assert("cart cleared", (await req("GET", "/cart")).data?.cart?.length === 0, "not cleared");
  await req("POST", "/orders/verify-payment", { shopKartOrderId: shopId, razorpay_order_id: rpId, razorpay_payment_id: payId, razorpay_signature: sig });
  assert("no double decrement on replay", (await stockOf()) === after, "decremented twice!");

  // 3b. Sync after paid → already-verified (recovery path consistent)
  const sy1 = await req("POST", `/orders/${shopId}/sync`);
  assert("sync after paid idempotent", sy1.status === 200 && sy1.data?.order?.paymentStatus === "PAID", `got ${sy1.status}`);

  // 4. Cancel flow
  await req("POST", `/cart/${pid}`);
  const c4 = await req("POST", "/orders/create-payment-order", { shippingAddress: addr });
  const cancelId = c4.data?.shopKartOrderId;
  const cx = await req("POST", `/orders/${cancelId}/cancel`);
  assert("cancel pending → FAILED", cx.status === 200 && cx.data?.order?.paymentStatus === "FAILED", `got ${cx.status}`);
  const cxPaid = await req("POST", `/orders/${shopId}/cancel`);
  assert("cancel paid → 400", cxPaid.status === 400, `got ${cxPaid.status}`);

  // 5. Status machine is ADMIN-ONLY now
  const noKey = await req("PATCH", `/orders/${shopId}/status`, { status: "CONFIRMED" });
  assert("buyer advance → 403", noKey.status === 403, `got ${noKey.status} ${JSON.stringify(noKey.data)}`);
  assert("ADMIN_KEY present for admin tests", ADMIN_KEY ? true : "skip", "add ADMIN_KEY to backend/.env");
  if (ADMIN_KEY) {
    const s1 = await req("PATCH", `/orders/${shopId}/status`, { status: "CONFIRMED" }, true, adminHeaders());
    assert("admin PLACED→CONFIRMED", s1.status === 200, `got ${s1.status} ${JSON.stringify(s1.data)}`);
    const sBack = await req("PATCH", `/orders/${shopId}/status`, { status: "PLACED" }, true, adminHeaders());
    assert("backward rejected", sBack.status === 400, `got ${sBack.status}`);
    await req("PATCH", `/orders/${shopId}/status`, { status: "SHIPPED" }, true, adminHeaders());
    await req("PATCH", `/orders/${shopId}/status`, { status: "DELIVERED" }, true, adminHeaders());
    const fin = await req("GET", `/orders/${shopId}`);
    assert("reaches DELIVERED", fin.data?.order?.status === "DELIVERED", JSON.stringify(fin.data?.order?.status));
  } else {
    assert("admin PLACED→CONFIRMED", "skip", "no ADMIN_KEY");
  }
} else {
  assert("retry reuses same order (no duplicate)", "skip", "no gateway keys");
  assert("verify PAID/PLACED", "skip", "no gateway keys");
}

console.log("\n==== LAB06 HARDENING ====");
for (const l of results) console.log(l);
console.log(`\nPASS ${passed}, FAIL ${failed}, SKIP ${skipped}`);
if (failed > 0) process.exit(1);
