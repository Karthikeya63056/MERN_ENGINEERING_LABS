import Razorpay from "razorpay";

// Razorpay client — Test Mode keys only. The secret never leaves the backend:
// only the Key ID is ever returned to React (see order.controller.js).
//
// NOTE: this module is imported before dotenv.config() runs (ES imports are
// hoisted), so env must be read LAZILY per request — never at import time.
// When keys are absent, getRazorpayClient() returns null and
// create-payment-order fails with a clear message instead of crashing boot.
export const isRazorpayConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let cached = null;
let cachedFor = "";

export const getRazorpayClient = () => {
    if (!isRazorpayConfigured()) return null;
    const fingerprint = `${process.env.RAZORPAY_KEY_ID}`;
    if (!cached || cachedFor !== fingerprint) {
        cached = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        cachedFor = fingerprint;
    }
    return cached;
};

export default { getRazorpayClient, isRazorpayConfigured };
