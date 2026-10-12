import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrderById } from '../services/orders'
import Navbar from '../components/Navbar'

function OrderSuccess() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    getOrderById(id)
      .then((data) => { if (live) setOrder(data.order) })
      .catch(() => { if (live) setErr('We could not load your order confirmation.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [id])

  return (
    <div>
      <Navbar />
      <main className="shop">
        {loading && <p className="loading">Confirming your order...</p>}
        {!loading && err && <p className="error">{err}</p>}
        {/* Success is shown ONLY for verified-paid orders. A pending/failed
            order opened by URL shows its true state instead of a success. */}
        {!loading && !err && order && order.paymentStatus === 'PAID' && (
          <div className="card success-card">
            <p className="eyebrow">✅ Order Placed Successfully</p>
            <h1 className="ledger-name">Thank you{order.shippingAddress?.fullName ? `, ${order.shippingAddress.fullName.split(' ')[0]}` : ''}.</h1>
            <p className="ledger-sub">Your order has been saved successfully.</p>
            <div className="ledger">
              <div className="ledger-row"><span>Order ID</span><p>{order._id}</p></div>
              <div className="ledger-row"><span>Total</span><p>₹{(order.totalAmount || 0).toLocaleString('en-IN')}</p></div>
              <div className="ledger-row"><span>Status</span><p>{order.status}</p></div>
              <div className="ledger-row"><span>Payment</span><p>{order.paymentStatus}</p></div>
            </div>
            <Link to="/orders" className="btn btn-primary ledger-cta">View My Orders</Link>
            <Link to="/products" className="switch-link">Continue shopping →</Link>
          </div>
        )}
        {!loading && !err && order && order.paymentStatus !== 'PAID' && (
          <div className="card success-card">
            <p className="eyebrow">Payment {order.paymentStatus === 'FAILED' ? 'failed' : 'pending'}</p>
            <h1 className="ledger-name">This order is not confirmed.</h1>
            <p className="ledger-sub">
              {order.paymentStatus === 'FAILED'
                ? 'The payment did not go through. Your cart was kept — please try checkout again.'
                : 'Payment for this order is still pending. Complete it from the cart checkout.'}
            </p>
            <div className="ledger">
              <div className="ledger-row"><span>Order ID</span><p>{order._id}</p></div>
              <div className="ledger-row"><span>Payment</span><p>{order.paymentStatus}</p></div>
            </div>
            <Link to="/cart" className="btn btn-primary ledger-cta">Back to Cart</Link>
            <Link to="/orders" className="switch-link">View My Orders →</Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default OrderSuccess
