import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrderById, syncPayment } from '../services/orders'
import { warnApi } from '../services/api'
import { StatusPill, StatusTracker } from '../components/OrderStatus'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Breadcrumbs, SafeImage } from '../components/ui'

function OrderDetails() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Recovery for dropped verifications (browser closed after paying):
  // re-checks Razorpay capture state server-side and finalizes if paid.
  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncMsg('')
    try {
      const data = await syncPayment(id)
      setOrder(data.order || order)
      setSyncMsg(data.message || 'Payment status refreshed.')
    } catch (error) {
      warnApi('order-details:sync', error)
      setSyncMsg(error.response?.data?.message || 'Could not refresh payment status.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    setErr('')
    getOrderById(id)
      .then((data) => { if (live) setOrder(data.order) })
      .catch((error) => {
        warnApi('order-details:load', error)
        if (live) setErr(error.response?.status === 404 ? 'Order not found.' : 'Something went wrong while loading this order.')
      })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [id])

  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <Breadcrumbs trail={[
          { label: 'Home', to: '/home' },
          { label: 'Orders', to: '/orders' },
          { label: 'Details' },
        ]} />

        {loading && <p className="loading">Loading order...</p>}
        {!loading && err && <p className="error">{err}</p>}

        {!loading && !err && order && (
          <>
            <p className="eyebrow left">Order #{order._id}</p>
            <h1 className="shop-title">₹{(order.totalAmount || 0).toLocaleString('en-IN')}</h1>
            <p className="shop-sub wish-count"><StatusPill status={order.status} /> · {order.paymentStatus} · {order.items?.length || 0} item{(order.items || []).length === 1 ? '' : 's'}</p>
            <StatusTracker status={order.status} />
            {/* Fulfilment is admin-controlled (x-admin-key); buyers never get
                an advance control here. Owners can only refresh payment state
                for orders still awaiting payment. */}
            {order.status === 'PENDING_PAYMENT' && (
              <div className="advance-row">
                <button type="button" className="btn btn-outline" disabled={syncing} onClick={handleSync}>
                  {syncing ? 'Checking...' : 'Refresh payment status'}
                </button>
                <span className="summary-note">Paid but the page closed? This re-checks Razorpay.</span>
              </div>
            )}
            {syncMsg && <p className="notice" role="status">{syncMsg}</p>}
            <div className="cart-layout">
              <section className="cart-list" aria-label="Order items">
                {(order.items || []).map((it) => (
                  <article key={it.product} className="cart-item">
                    {it.image && (
                      <Link to={`/products/${it.product}`} className="cart-thumb">
                        <SafeImage src={it.image} alt={it.name} />
                      </Link>
                    )}
                    <div className="cart-info">
                      <h3 className="cart-name">
                        <Link to={`/products/${it.product}`}>{it.name}</Link>
                      </h3>
                      <p className="product-price">₹{(it.price || 0).toLocaleString('en-IN')} × {it.quantity}</p>
                      <p className="line-total">₹{((it.price || 0) * (it.quantity || 0)).toLocaleString('en-IN')}</p>
                    </div>
                  </article>
                ))}
              </section>
              <aside className="summary" aria-label="Delivery details">
                <h2>Delivery</h2>
                <div className="summary-row"><span>Name</span><p>{order.shippingAddress?.fullName}</p></div>
                <div className="summary-row"><span>Phone</span><p>{order.shippingAddress?.phone}</p></div>
                <div className="summary-row"><span>Address</span><p>{order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}</p></div>
                <div className="summary-row total"><span>Total</span><p>₹{(order.totalAmount || 0).toLocaleString('en-IN')}</p></div>
                <Link to="/orders" className="switch-link">← Back to orders</Link>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default OrderDetails
