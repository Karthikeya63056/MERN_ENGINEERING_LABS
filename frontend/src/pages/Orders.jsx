import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../services/orders'
import { StatusPill } from '../components/OrderStatus'
import Navbar from '../components/Navbar'

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await getOrders()
      setOrders(data.orders || [])
    } catch (error) {
      console.log(error)
      setErr("We couldn't load your orders.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <div>
      <Navbar />
      <main className="shop">
        <p className="eyebrow left">Purchase history</p>
        <h1 className="shop-title">My Orders</h1>

        {loading && <p className="loading">Loading your orders...</p>}

        {!loading && err && (
          <div className="empty">
            <p className="empty-title">Something went wrong.</p>
            <p className="empty-sub">{err}</p>
            <button type="button" className="btn btn-primary inline-btn" onClick={fetchOrders}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !err && orders.length === 0 && (
          <div className="empty">
            <p className="empty-title">You have not placed any orders yet</p>
            <p className="empty-sub">Your confirmed orders will appear here.</p>
            <Link to="/products" className="btn btn-primary inline-btn">Start Shopping</Link>
          </div>
        )}

        {!loading && !err && orders.length > 0 && (
          <div className="cart-list">
            {orders.map((order) => (
              <article key={order._id} className="cart-item">
                <div className="cart-info">
                  <p className="product-category">Order #{order._id} · {fmtDate(order.createdAt)}</p>
                  {(order.items || []).slice(0, 3).map((it) => (
                    <p key={it.product} className="ledger-sub">{it.name} × {it.quantity}</p>
                  ))}
                  {(order.items || []).length > 3 && (
                    <p className="ledger-sub">+{(order.items || []).length - 3} more…</p>
                  )}
                  <div className="qty-row">
                    <p className="line-total">₹{(order.totalAmount || 0).toLocaleString('en-IN')}</p>
                    <StatusPill status={order.status} />
                  </div>
                  <Link to={`/orders/${order._id}`} className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Orders
