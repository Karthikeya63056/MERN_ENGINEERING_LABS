// Order service — thin API wrappers. Cart state reset after verified
// payment is handled by CartContext.refresh() in the Checkout page.
import api from './api'

export const createPaymentOrder = (shippingAddress) =>
  api.post('/orders/create-payment-order', { shippingAddress }).then((res) => res.data)

export const verifyPayment = ({ shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
  api.post('/orders/verify-payment', {
    shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature,
  }).then((res) => res.data)

export const getOrders = () => api.get('/orders').then((res) => res.data)

export const getOrderById = (id) => api.get(`/orders/${id}`).then((res) => res.data)

export const updateOrderStatus = (id, status, adminKey) =>
  api.patch(`/orders/${id}/status`, { status }, adminKey ? { headers: { 'x-admin-key': adminKey } } : undefined).then((res) => res.data)

// Best-effort: close a pending order after an explicit Razorpay failure so
// it doesn't linger as payable. Failures here are swallowed by callers.
export const cancelOrder = (id) =>
  api.post(`/orders/${id}/cancel`).then((res) => res.data)

// Recovery: ask the server to re-check Razorpay capture state for an order
// whose verification never completed (e.g. browser closed after paying).
export const syncPayment = (id) =>
  api.post(`/orders/${id}/sync`).then((res) => res.data)
