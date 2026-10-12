import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { createPaymentOrder, verifyPayment, cancelOrder } from '../services/orders'
import Navbar from '../components/Navbar'

const EMPTY_FORM = { fullName: '', phone: '', addressLine1: '', city: '', state: '', pincode: '' }

// Loads Razorpay Checkout.js on demand. Resolves false instead of assuming
// window.Razorpay always exists (offline / blocked script).
const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true)
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

// Razorpay prefill contact must be exactly 10 Indian digits. Stored phones
// may include +91, spaces or a leading 0 — normalize to the last 10 digits.
const toRazorpayContact = (phone) => (phone || '').replace(/\D/g, '').slice(-10)

const validateForm = (form) => {
  const errors = {}
  for (const [field, value] of Object.entries(form)) {
    if (!value || value.trim() === '') {
      errors[field] = 'This field is required'
    }
  }
  if (!errors.phone && form.phone) {
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) {
      errors.phone = 'Enter a valid phone number'
    }
  }
  if (!errors.pincode && form.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = 'Pincode must contain 6 digits'
  }
  return errors
}

function Checkout() {
  const { items, loading: cartLoading, count, subtotal, refresh } = useCart()
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [backendError, setBackendError] = useState('')
  const [notice, setNotice] = useState('')
  const [placing, setPlacing] = useState(false)
  const [paying, setPaying] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const openRazorpay = async (checkoutData, address) => {
    const scriptOk = await loadRazorpayScript()
    if (!scriptOk) {
      setBackendError('Payment window could not be loaded. Check your connection and try again. Your cart is unchanged.')
      setPaying(false)
      setPlacing(false)
      return
    }
    const options = {
      key: checkoutData.key,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      name: 'ShopKart',
      description: 'ShopKart Order',
      order_id: checkoutData.razorpayOrderId,
      // Razorpay's contact field wants exactly 10 Indian digits — the stored
      // phone may carry +91, spaces or a leading 0, so normalize it here.
      prefill: { name: address.fullName, contact: toRazorpayContact(address.phone) },
      theme: {},
      // handler ≠ success. It only delivers Razorpay's three strings;
      // the backend verifies the signature before anything is confirmed.
      handler: async (response) => {
        try {
          await verifyPayment({
            shopKartOrderId: checkoutData.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          // Backend cleared the cart — mirror it so Navbar hits Cart (0) now.
          await refresh()
          navigate(`/order-success/${checkoutData.shopKartOrderId}`, { replace: true })
        } catch (err) {
          console.log(err)
          setBackendError(err.response?.data?.message || 'Payment verification failed. Your cart has not been cleared.')
        } finally {
          setPaying(false)
          setPlacing(false)
        }
      },
    }
    const paymentObject = new window.Razorpay(options)
    paymentObject.on('payment.failed', (response) => {
      console.log(response.error)
      // Close the loop: mark the pending order failed so it can't linger as
      // payable. Best-effort — the failure message shows regardless.
      cancelOrder(checkoutData.shopKartOrderId).catch(() => {})
      setBackendError('Payment failed. Your cart has not been cleared. Please try again.')
      setPaying(false)
      setPlacing(false)
    })
    paymentObject.open()
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setBackendError('')
    setNotice('')
    // Client validation first — no backend call on basic form errors.
    const errors = validateForm(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (items.length === 0) return

    setPlacing(true)
    try {
      const address = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim()]),
      )
      const data = await createPaymentOrder(address)
      setPaying(true)
      setNotice('Order reserved. Complete the payment to confirm it.')
      await openRazorpay(data, address)
    } catch (err) {
      console.log(err)
      if (err.response?.status === 503) {
        setBackendError('Payments are not enabled yet (backend Razorpay Test keys missing). Your cart is unchanged — ask the backend owner to add keys and retry.')
      } else {
        setBackendError(err.response?.data?.message || 'Could not place your order. Your cart is unchanged.')
      }
      setPlacing(false)
    }
  }

  return (
    <div>
      <Navbar />
      <main className="shop">
        <p className="eyebrow left">Almost yours</p>
        <h1 className="shop-title">Checkout</h1>

        {cartLoading && <p className="loading">Loading your cart...</p>}

        {!cartLoading && items.length === 0 && (
          <div className="empty">
            <p className="empty-title">Your cart is empty 🛒</p>
            <p className="empty-sub">Add something before checking out.</p>
            <Link to="/products" className="btn btn-primary inline-btn">Browse Products</Link>
          </div>
        )}

        {!cartLoading && items.length > 0 && (
          <div className="cart-layout">
            <section className="card checkout-card" aria-label="Shipping details">
              <h2 className="form-title">Shipping Details</h2>
              {backendError && <p className="error" role="alert">{backendError}</p>}
              {notice && <p className="notice" role="status">{notice}</p>}
              <form className="form" onSubmit={handlePlaceOrder} noValidate>
                <div>
                  <label htmlFor="fullName">Full Name</label>
                  <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="Aarav Sharma" />
                  {formErrors.fullName && <p className="wish-error">{formErrors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="9876543210" />
                  {formErrors.phone && <p className="wish-error">{formErrors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="addressLine1">Address</label>
                  <input id="addressLine1" name="addressLine1" type="text" value={form.addressLine1} onChange={handleChange} placeholder="22 MG Road" />
                  {formErrors.addressLine1 && <p className="wish-error">{formErrors.addressLine1}</p>}
                </div>
                <div className="form-row">
                  <div>
                    <label htmlFor="city">City</label>
                    <input id="city" name="city" type="text" value={form.city} onChange={handleChange} placeholder="Bengaluru" />
                    {formErrors.city && <p className="wish-error">{formErrors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="state">State</label>
                    <input id="state" name="state" type="text" value={form.state} onChange={handleChange} placeholder="Karnataka" />
                    {formErrors.state && <p className="wish-error">{formErrors.state}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="pincode">Pincode</label>
                  <input id="pincode" name="pincode" type="text" inputMode="numeric" value={form.pincode} onChange={handleChange} placeholder="560001" />
                  {formErrors.pincode && <p className="wish-error">{formErrors.pincode}</p>}
                </div>
                <button type="submit" className="btn btn-primary" disabled={placing || paying}>
                  {paying ? 'Waiting for payment...' : placing ? 'Placing order...' : 'Place Order'}
                </button>
              </form>
            </section>
            <aside className="summary" aria-label="Order summary">
              <h2>Order Summary</h2>
              {items.map((it) => (
                <div key={it.product._id} className="summary-row">
                  <span>{it.product.name} × {it.quantity}</span>
                  <p>₹{(it.product.price * it.quantity).toLocaleString('en-IN')}</p>
                </div>
              ))}
              <div className="summary-row"><span>Items</span><p>{count}</p></div>
              <div className="summary-row total"><span>Total</span><p>₹{subtotal.toLocaleString('en-IN')}</p></div>
              <p className="summary-note">Final price and stock are re-verified on the server.</p>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

export default Checkout
