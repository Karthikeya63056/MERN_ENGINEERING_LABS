import mongoose from "mongoose";
import crypto from "crypto";
import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { getRazorpayClient, isRazorpayConfigured } from "../config/razorpay.js";

// Shipping validation shared by the API. Mirrors the frontend form rules:
// every field required, whitespace-only rejected, phone numeric, 6-digit pin.
const validateShippingAddress = (address) => {
    if (!address || typeof address !== "object") {
        return "Shipping address is required";
    }
    const fields = ["fullName", "phone", "addressLine1", "city", "state", "pincode"];
    for (const field of fields) {
        if (typeof address[field] !== "string" || address[field].trim() === "") {
            return `${field} is required`;
        }
    }
    const digits = address.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
        return "Phone must contain a valid number";
    }
    if (!/^\d{6}$/.test(address.pincode.trim())) {
        return "Pincode must contain 6 digits";
    }
    return null;
};

const toSnapshotItem = (product, quantity) => ({
    product: product._id,
    name: product.name,
    price: product.price,
    quantity,
    image: product.image
});

// True when a stored PENDING order snapshots exactly the current checkout
// (same items, prices, quantities, total and address) — i.e. a retry of the
// same intent rather than a new purchase.
const sameCheckout = (order, snapshotItems, shippingAddress, totalAmount) => {
    if (!order || order.totalAmount !== totalAmount) return false;
    const addressFields = ["fullName", "phone", "addressLine1", "city", "state", "pincode"];
    for (const field of addressFields) {
        if (order.shippingAddress?.[field] !== shippingAddress[field]) return false;
    }
    if (!Array.isArray(order.items) || order.items.length !== snapshotItems.length) return false;
    return snapshotItems.every((item) =>
        order.items.some(
            (saved) =>
                saved.product.toString() === item.product.toString() &&
                saved.price === item.price &&
                saved.quantity === item.quantity &&
                saved.name === item.name
        )
    );
};

// POST /orders/create-payment-order
// Body: { shippingAddress } ONLY — items/total are read from the server cart
// and server Product data. Anything else in the body (e.g. totalAmount) is
// ignored, so a manipulated frontend total can never affect pricing.
export const createPaymentOrder = async (req, res) => {
    try {
        const addressError = validateShippingAddress(req.body?.shippingAddress);
        if (addressError) {
            return res.status(400).json({ message: addressError });
        }
        const shippingAddress = {
            fullName: req.body.shippingAddress.fullName.trim(),
            phone: req.body.shippingAddress.phone.trim(),
            addressLine1: req.body.shippingAddress.addressLine1.trim(),
            city: req.body.shippingAddress.city.trim(),
            state: req.body.shippingAddress.state.trim(),
            pincode: req.body.shippingAddress.pincode.trim()
        };

        const customer = await Customer.findById(req.user._id).populate({
            path: "cart.product",
            select: "name price image stock"
        });
        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        if (!customer.cart || customer.cart.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Final verification against LATEST product data (cart may be stale).
        const snapshotItems = [];
        let totalAmount = 0;
        for (const entry of customer.cart) {
            if (!entry.product) {
                return res.status(400).json({ message: "A product in your cart is no longer available" });
            }
            if (entry.quantity > entry.product.stock) {
                return res.status(400).json({ message: `Insufficient stock for ${entry.product.name}` });
            }
            snapshotItems.push(toSnapshotItem(entry.product, entry.quantity));
            totalAmount += entry.product.price * entry.quantity;
        }

        // Gateway check BEFORE persisting, so validation-only tests never
        // leave orphan PENDING orders when keys are not set up yet.
        if (!isRazorpayConfigured()) {
            return res.status(503).json({ message: "Payment gateway not configured. Add Razorpay Test Mode keys to backend .env and restart." });
        }

        const checkoutPayload = (shopKartOrder, razorpayOrder, reused) => ({
            success: true,
            reused,
            shopKartOrderId: shopKartOrder._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });

        const newRazorpayOrder = async (shopKartOrderId, amount) => {
            // Razorpay wants the smallest currency unit: ₹7497 → 749700 paise.
            const razorpay = getRazorpayClient();
            return razorpay.orders.create({
                amount: Math.round(amount * 100),
                currency: "INR",
                receipt: shopKartOrderId.toString()
            });
        };

        // Idempotency: a double-click, retry or refresh with an unchanged
        // cart + address must NOT mint a second ShopKart order. If the user's
        // latest PENDING order already snapshots exactly this checkout, reuse
        // it and attach a fresh Razorpay order (old ones are simply abandoned).
        const latestPending = await Order.findOne({
            user: customer._id,
            paymentStatus: "PENDING",
            status: "PENDING_PAYMENT"
        }).sort({ createdAt: -1 });

        if (latestPending && sameCheckout(latestPending, snapshotItems, shippingAddress, totalAmount)) {
            const razorpayOrder = await newRazorpayOrder(latestPending._id, totalAmount);
            latestPending.razorpayOrderId = razorpayOrder.id;
            await latestPending.save();
            return res.status(200).json(checkoutPayload(latestPending, razorpayOrder, true));
        }

        // Intent changed since the last checkout attempt: retire the stale
        // pending order so exactly one checkout stays payable per user.
        let superseded = null;
        if (latestPending) {
            latestPending.paymentStatus = "FAILED";
            await latestPending.save();
            superseded = latestPending._id;
        }

        const checkoutResponse = (shopKartOrder, razorpayOrder, reused) => ({
            ...checkoutPayload(shopKartOrder, razorpayOrder, reused),
            ...(superseded ? { superseded } : {})
        });

        let shopKartOrder;
        try {
            shopKartOrder = await Order.create({
                user: customer._id,
                items: snapshotItems,
                shippingAddress,
                totalAmount,
                paymentStatus: "PENDING",
                status: "PENDING_PAYMENT"
            });
        } catch (err) {
            // Lost a TRUE concurrent-create race (both requests passed the
            // reuse check above simultaneously): the unique PENDING_PAYMENT
            // index admitted exactly one. Reuse the winner for identical
            // checkouts; otherwise the user already has a checkout in flight.
            if (err.code === 11000) {
                const winner = await Order.findOne({
                    user: customer._id,
                    paymentStatus: "PENDING",
                    status: "PENDING_PAYMENT"
                }).sort({ createdAt: -1 });
                if (winner && sameCheckout(winner, snapshotItems, shippingAddress, totalAmount)) {
                    const razorpayOrder = await newRazorpayOrder(winner._id, totalAmount);
                    winner.razorpayOrderId = razorpayOrder.id;
                    await winner.save();
                    return res.status(200).json(checkoutPayload(winner, razorpayOrder, true));
                }
                return res.status(409).json({ message: "A checkout is already in progress. Please complete or cancel it before starting another." });
            }
            throw err;
        }

        const razorpayOrder = await newRazorpayOrder(shopKartOrder._id, totalAmount);

        shopKartOrder.razorpayOrderId = razorpayOrder.id;
        await shopKartOrder.save();

        // Key ID is public by design; the SECRET never leaves the backend.
        return res.status(201).json(checkoutResponse(shopKartOrder, razorpayOrder, false));
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// POST /orders/verify-payment
// Body: { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// The browser's claim is NEVER trusted: the HMAC is recomputed server-side
// using the DB-stored Razorpay order id. Cart clears ONLY here, on success.
class StockConflict extends Error {}

const markFailed = async (orderId, message) => {
    const order = await Order.findById(orderId);
    if (order && order.paymentStatus !== "PAID") {
        order.paymentStatus = "FAILED";
        await order.save();
    }
    return { http: 400, body: { message } };
};

// Shared payment finalizer — idempotent. Used by verify-payment (after HMAC)
// and by sync (after a server-side Razorpay capture lookup, which needs no
// HMAC because the data arrives over our authenticated server connection).
// Stock recheck + guarded decrements + PAID save + cart clear run inside ONE
// MongoDB transaction where supported (replica sets, incl. Atlas); on
// standalone servers it falls back to the guarded sequential path. Either
// way a failure between steps can never leave half-applied state behind:
// the txn aborts atomically, the fallback rolls decrements back manually.
const finalizePaymentSuccess = async (orderId, userId, paymentId) => {
    const commit = async (session) => {
        // Re-read INSIDE the unit of work so transaction retries observe the
        // latest state instead of double-applying on a stale document.
        const orderQuery = Order.findOne({ _id: orderId, user: userId });
        const order = session ? await orderQuery.session(session) : await orderQuery;
        if (!order) return { http: 404, body: { message: "Order not found" } };
        if (order.paymentStatus === "PAID") {
            return { http: 200, body: { success: true, message: "Payment already verified", order } };
        }

        const latestQuery = Product.find({ _id: { $in: order.items.map((item) => item.product) } }).select("name stock");
        const latest = session ? await latestQuery.session(session) : await latestQuery;
        const stockById = new Map(latest.map((p) => [p._id.toString(), p]));
        for (const item of order.items) {
            const product = stockById.get(item.product.toString());
            if (!product || item.quantity > product.stock) {
                throw new StockConflict(product ? `Insufficient stock for ${product.name}` : "A product in your order is no longer available");
            }
        }

        const opt = session ? { session } : undefined;
        const decremented = [];
        for (const item of order.items) {
            const result = await Product.updateOne(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                opt
            );
            if (result.matchedCount === 0) {
                if (session) throw new StockConflict(`Insufficient stock for ${item.name}`);
                for (const done of decremented) {
                    await Product.updateOne({ _id: done.product }, { $inc: { stock: done.quantity } });
                }
                return markFailed(orderId, `Insufficient stock for ${item.name}`);
            }
            decremented.push(item);
        }

        order.paymentStatus = "PAID";
        order.status = "PLACED";
        order.razorpayPaymentId = paymentId;
        await order.save(opt);
        await Customer.updateOne({ _id: userId }, { $set: { cart: [] } }, opt);
        return { http: 200, body: { success: true, message: "Payment verified. Order placed.", order } };
    };

    try {
        const session = await mongoose.startSession();
        try {
            let outcome;
            await session.withTransaction(async () => {
                outcome = await commit(session);
            });
            return outcome;
        } catch (err) {
            if (err instanceof StockConflict) {
                return markFailed(orderId, err.message);
            }
            if (/replica set|transaction/i.test(err.message || "")) {
                return commit(null);
            }
            throw err;
        } finally {
            await session.endSession();
        }
    } catch (err) {
        console.log(err);
        return { http: 500, body: { message: "Internal Server Error" } };
    }
};
export const verifyPayment = async (req, res) => {
    try {
        const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

        if (!shopKartOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Payment details are incomplete" });
        }
        if (!mongoose.isValidObjectId(shopKartOrderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        // Ownership enforced: another user's order id yields 404, never data.
        const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Idempotent retry: an already-paid order returns success without
        // touching the (already cleared) cart again.
        if (order.paymentStatus === "PAID") {
            return res.status(200).json({ success: true, message: "Payment already verified", order });
        }

        if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ message: "Invalid payment details" });
        }

        const body = `${order.razorpayOrderId}|${razorpay_payment_id}`;
        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        const valid =
            expected.length === String(razorpay_signature).length &&
            crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));

        if (!valid) {
            order.paymentStatus = "FAILED";
            await order.save();
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        // Hand off to the shared transactional finalizer: stock recheck +
        // guarded decrements + PAID save + cart clear as ONE unit of work.
        const outcome = await finalizePaymentSuccess(order._id, req.user._id, razorpay_payment_id);
        return res.status(outcome.http).json(outcome.body);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// POST /orders/:id/sync — recovery for dropped verifications.
// If the browser closed (or the network failed) after a successful Razorpay
// payment, the order sits PENDING with money captured. This endpoint asks
// Razorpay server-side whether a captured payment exists for the stored
// order id and, if so, runs the SAME transactional finalizer as verify.
// No HMAC is needed: trust comes from our authenticated Razorpay API call,
// not from browser-supplied strings.
export const syncPayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.paymentStatus === "PAID") {
            return res.status(200).json({ success: true, message: "Payment already verified", order });
        }
        if (!order.razorpayOrderId) {
            return res.status(400).json({ message: "No payment attempt found for this order" });
        }
        if (!isRazorpayConfigured()) {
            return res.status(503).json({ message: "Payment gateway not configured." });
        }
        const payments = await getRazorpayClient().orders.fetchPayments(order.razorpayOrderId);
        const captured = (payments?.items || []).find((p) => p.status === "captured");
        if (!captured) {
            return res.status(200).json({ success: true, paymentStatus: order.paymentStatus, message: "No captured payment found", order });
        }
        const outcome = await finalizePaymentSuccess(order._id, req.user._id, captured.id);
        return res.status(outcome.http).json(outcome.body);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /orders — current user's orders, newest first.
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .select("-__v")
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: orders.length, orders });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /orders/:id — ownership enforced.
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findOne({ _id: id, user: req.user._id }).select("-__v");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.status(200).json({ success: true, order });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /orders/:id/status — bonus: fulfilment progression.
// PLACED → CONFIRMED → SHIPPED → DELIVERED. Forward-only state machine.
// Fulfilment is admin-controlled: callers must send the backend ADMIN_KEY as
// `x-admin-key`. There is deliberately NO buyer path — owners cannot move
// their own orders, even in demo mode. Configure ADMIN_KEY in backend .env.
const PROGRESSION = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        if (!PROGRESSION.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${PROGRESSION.join(", ")}` });
        }

        if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
            return res.status(403).json({ message: "Admin access required" });
        }

        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.paymentStatus !== "PAID" || order.status === "PENDING_PAYMENT") {
            return res.status(400).json({ message: "Only paid orders can progress" });
        }

        const currentIndex = PROGRESSION.indexOf(order.status);
        const targetIndex = PROGRESSION.indexOf(status);
        if (targetIndex <= currentIndex) {
            return res.status(400).json({ message: `Order is already ${order.status}. Status can only move forward.` });
        }

        order.status = status;
        await order.save();
        return res.status(200).json({ success: true, message: `Order ${status.toLowerCase()}`, order });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// POST /orders/:id/cancel — close the loop on abandoned/failed payments.
// Owners may cancel their own order only while it is still awaiting payment
// (PENDING_PAYMENT). Paid orders are never cancellable here. The frontend
// calls this (best-effort) when Razorpay reports payment.failed, so pending
// orders don't linger indefinitely after an explicit failure.
export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.paymentStatus === "PAID" || order.status !== "PENDING_PAYMENT") {
            return res.status(400).json({ message: "Only orders awaiting payment can be cancelled" });
        }
        order.paymentStatus = "FAILED";
        await order.save();
        return res.status(200).json({ success: true, message: "Order cancelled", order });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
