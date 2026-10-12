import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import api from '../services/api'
import { getWishlist, toggleWishlist } from '../services/wishlist'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'

const AISLES = [
  { name: 'Electronics', tagline: 'Light up your home', emoji: '✨' },
  { name: 'Fashion', tagline: 'Dress for the dhamaka', emoji: '👗' },
  { name: 'Books', tagline: 'Stories by the diya', emoji: '📚' },
  { name: 'Home', tagline: 'Festive corners', emoji: '🪔' },
]

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'a', 'an', 'of', 'in', 'on', 'men', 'women', 'new', 'set'])

// Next Sunday midnight, local time — the sale's real deadline.
const nextDeadline = () => {
  const d = new Date()
  const daysLeft = (7 - d.getDay()) % 7 || 7
  const end = new Date(d)
  end.setDate(d.getDate() + daysLeft)
  end.setHours(23, 59, 59, 0)
  if (end <= d) end.setDate(end.getDate() + 7)
  return end.getTime()
}

const pad = (n) => String(n).padStart(2, '0')

function useCountdown() {
  const [target] = useState(nextDeadline)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const diff = Math.max(0, target - now)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    mins: Math.floor(diff / 60000) % 60,
    secs: Math.floor(diff / 1000) % 60,
  }
}

function Home() {
  const { user, setUser } = useAuth()
  const { addItem: addToCart, pendingIds: cartPending, itemErrors: cartErrors } = useCart()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(user || null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())
  const [wishErrors, setWishErrors] = useState({})

  useEffect(() => {
    if (user) {
      setCustomer(user)
      return
    }
    api.get('/customers/me')
      .then((res) => {
        setCustomer(res.data)
        setUser(res.data)
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [user, setUser, navigate])

  useEffect(() => {
    let live = true
    setLoading(true)
    api.get('/products')
      .then((res) => {
        if (!live) return
        setProducts(res.data.products || [])
        setErr('')
      })
      .catch(() => { if (live) setErr('The shelves are unreachable right now.') })
      .finally(() => { if (live) setLoading(false) })
    getWishlist()
      .then((data) => { if (live) setSavedIds(new Set((data.wishlist || []).map((p) => p._id))) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const handleToggleWishlist = async (productId) => {
    if (savingIds.has(productId)) return
    setSavingIds((prev) => new Set(prev).add(productId))
    setWishErrors((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
    try {
      const data = await toggleWishlist(productId)
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (data.saved) next.add(productId)
        else next.delete(productId)
        return next
      })
    } catch {
      setWishErrors((prev) => ({ ...prev, [productId]: true }))
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const firstName = customer?.fullName?.split(' ')[0] || 'Guest'
  const inStock = products.filter((p) => p.stock > 0)
  const counts = {}
  const firstImage = {}
  for (const p of products) {
    counts[p.category] = (counts[p.category] || 0) + 1
    if (!firstImage[p.category] && p.image) firstImage[p.category] = p.image
  }
  // Trending now: most frequent meaningful words in live product names —
  // every chip is guaranteed to return results.
  const trending = (() => {
    const freq = {}
    for (const p of products) {
      for (const word of String(p.name || '').toLowerCase().split(/[^a-z0-9]+/)) {
        if (word.length > 3 && !STOPWORDS.has(word)) freq[word] = (freq[word] || 0) + 1
      }
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w)
  })()
  const { days, hours, mins, secs } = useCountdown()
  const bestsellers = [...inStock].sort((a, b) => b.stock - a.stock).slice(0, 8)
  const steal = [...inStock].sort((a, b) => a.price - b.price)[0] || null

  return (
    <div>
      <Navbar />
      <main className="shop home">
        <section className="fest-hero" aria-label="Festival of Lights Sale">
          <div className="fest-diyas" aria-hidden="true">🪔 ✨ 🪔 ✨ 🪔</div>
          <p className="eyebrow light">Namaste, {firstName} · The Festival of Lights Sale is live</p>
          <h1 className="fest-title">Sajao apna ghar,<br />light up every corner.</h1>
          <p className="fest-sub">
            {products.length > 0
              ? `${products.length} festive finds across ${Object.keys(counts).length} aisles — picked for everyday India.`
              : 'Festive finds across four aisles — picked for everyday India.'}
          </p>
          <div className="fest-actions">
            <Link to="/products" className="btn btn-gold">Shop the sale →</Link>
            <Link to="/wishlist" className="btn btn-ghost-light">My wishlist ♥</Link>
          </div>
          <p className="fest-urgency">✨ Extra festive prices · Ends Sunday midnight ✨</p>
        </section>

        <section className="trust-strip" aria-label="Store promises">
          <div><strong>🚚 Free delivery</strong><span>over ₹999</span></div>
          <div><strong>↩️ 7-day returns</strong><span>no questions asked</span></div>
          <div><strong>💳 Secure checkout</strong><span>Razorpay protected</span></div>
        </section>

        {loading && <p className="loading">Lighting the diyas...</p>}
        {!loading && err && (
          <div className="empty">
            <p className="empty-title">The shelves are unreachable.</p>
            <p className="empty-sub">{err}</p>
            <Link to="/products" className="btn btn-primary inline-btn">Try the shelves directly</Link>
          </div>
        )}

        {!loading && !err && (
          <>
            <section aria-label="Shop by category">
              <div className="related-head">
                <h2>Shop by aisle</h2>
                <Link to="/products" className="switch-link">View all →</Link>
              </div>
              <div className="aisle-grid">
                {AISLES.map((a) => (
                  <Link
                    key={a.name}
                    to={`/products?category=${encodeURIComponent(a.name)}`}
                    className="aisle-tile"
                  >
                    <span className="aisle-emoji" aria-hidden="true">{a.emoji}</span>
                    <strong>{a.name}</strong>
                    <span className="aisle-tag">{a.tagline}</span>
                    <span className="aisle-count big">{counts[a.name] || 0} finds</span>
                  </Link>
                ))}
              </div>
            </section>

            {steal && (
              <section className="steal" aria-label="Festive steal of the day">
                <div className="steal-badge">🔥 Festive steal</div>
                <div className="steal-body">
                  <img src={steal.image} alt={steal.name} loading="lazy" />
                  <div>
                    <p className="product-category">{steal.category}</p>
                    <h3>{steal.name}</h3>
                    <p className="details-price">₹{steal.price.toLocaleString('en-IN')}</p>
                    <p className="product-stock"><span className="stock-dot" aria-hidden="true" />{steal.stock} left — when it&apos;s gone, it&apos;s gone</p>
                    <div className="steal-actions">
                      <button
                        type="button"
                        className="btn btn-primary inline-btn"
                        disabled={cartPending.has(steal._id)}
                        onClick={() => addToCart(steal._id)}
                      >
                        {cartPending.has(steal._id) ? 'Adding...' : 'Add to Cart'}
                      </button>
                      <Link to={`/products/${steal._id}`} className="btn btn-outline">View Details</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {bestsellers.length > 0 && (
              <section aria-label="Bestsellers">
                <div className="related-head">
                  <h2>⭐ Bestsellers this Diwali</h2>
                  <Link to="/products" className="switch-link">View all →</Link>
                </div>
                <div className="product-grid">
                  {bestsellers.map((product, i) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      index={i}
                      saved={savedIds.has(product._id)}
                      saving={savingIds.has(product._id)}
                      wishError={wishErrors[product._id] ? true : ''}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={addToCart}
                      adding={cartPending.has(product._id)}
                      cartError={cartErrors[product._id] || ''}
                    />
                  ))}
                </div>
              </section>
            )}

            <p className="ledger-foot">🪔 Shubh Deepavali from the ShopKart family — more festive drops Friday. 🪔</p>
          </>
        )}
      </main>
    </div>
  )
}

export default Home
