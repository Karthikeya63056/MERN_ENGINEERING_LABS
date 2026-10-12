import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import Navbar from '../components/Navbar'
import CartItem from '../components/CartItem'

function Cart() {
  const { items, loading, error, refresh, updateQuantity, removeItem, pendingIds, itemErrors, count, subtotal } = useCart()

  const handleIncrease = (productId, nextQty) => updateQuantity(productId, nextQty)
  // Decrease never goes below 1 — explicit Remove is required at qty 1.
  const handleDecrease = (productId, nextQty) => {
    if (nextQty < 1) return
    updateQuantity(productId, nextQty)
  }

  return (
    <div>
      <Navbar />
      <main className="shop">
        <p className="eyebrow left">Ready to buy</p>
        <h1 className="shop-title">My Cart</h1>

        {loading && (
          <>
            <p className="loading">Loading your cart...</p>
            <div className="product-grid" aria-hidden="true">
              {[0, 1, 2].map((n) => (
                <div key={n} className="skel-card">
                  <div className="skel skel-img" />
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && error && items.length === 0 && (
          <div className="empty">
            <p className="empty-title">Unable to load your cart.</p>
            <p className="empty-sub">We couldn&apos;t reach the store. Please try again.</p>
            <button type="button" className="btn btn-primary inline-btn" onClick={refresh}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <p className="empty-title">Your cart is empty 🛒</p>
            <p className="empty-sub">Looks like you haven&apos;t added anything yet.</p>
            <Link to="/products" className="btn btn-primary inline-btn">Browse Products</Link>
          </div>
        )}

        {!loading && error && items.length > 0 && (
          <p className="notice" role="alert">
            {error} Showing your last saved cart — it may be out of date.{' '}
            <button type="button" className="notice-btn" onClick={refresh}>
              Retry
            </button>
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="cart-layout">
            <section className="cart-list" aria-label="Cart items">
              {items.map((item) => (
                <CartItem
                  key={item.product._id}
                  item={item}
                  pending={pendingIds.has(item.product._id)}
                  itemError={itemErrors[item.product._id] || ''}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                  onRemove={removeItem}
                />
              ))}
            </section>
            <aside className="summary" aria-label="Order summary">
              <h2>Order Summary</h2>
              <div className="summary-row"><span>Items</span><p>{count}</p></div>
              <div className="summary-row total"><span>Subtotal</span><p>₹{subtotal.toLocaleString('en-IN')}</p></div>
              <p className="summary-note">Shipping &amp; taxes calculated at checkout.</p>
              <button type="button" className="btn btn-primary">Proceed to Checkout</button>
              <Link to="/products" className="switch-link">Continue shopping →</Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

export default Cart
