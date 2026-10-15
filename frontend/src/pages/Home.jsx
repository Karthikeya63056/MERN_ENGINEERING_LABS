import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../components/Toast'
import api from '../services/api'
import { getWishlist, toggleWishlist } from '../services/wishlist'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import Rail from '../components/Rail'
import { SafeImage, SkeletonGrid, inr } from '../components/ui'

const AISLES = [
  { name: 'Electronics', tagline: 'Everyday tech' },
  { name: 'Fashion', tagline: 'Wear it well' },
  { name: 'Books', tagline: 'Stories for the shelf' },
  { name: 'Home', tagline: 'Corners that comfort' },
]

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'a', 'an', 'of', 'in', 'on', 'men', 'women', 'new', 'set'])

function Home() {
  const { user, setUser } = useAuth()
  const { addItem: addToCart, pendingIds: cartPending, itemErrors: cartErrors } = useCart()
  const { notify, notifyError } = useToast()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(user || null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [retryTick, setRetryTick] = useState(0)
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
  }, [retryTick])

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
      notify(data.saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.')
    } catch {
      setWishErrors((prev) => ({ ...prev, [productId]: true }))
      notifyError('Unable to update your wishlist.')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const handleAdd = async (productId, name) => {
    const failure = await addToCart(productId)
    if (failure === null) notify(`Added “${name}” to your cart.`)
    else if (failure) notifyError(failure)
    // undefined = duplicate click while pending; stay silent.
  }

  const cardProps = (product, i) => ({
    product,
    index: i,
    saved: savedIds.has(product._id),
    saving: savingIds.has(product._id),
    wishError: wishErrors[product._id] ? true : '',
    onToggleWishlist: handleToggleWishlist,
    onAddToCart: (id) => handleAdd(id, product.name),
    adding: cartPending.has(product._id),
    cartError: cartErrors[product._id] || '',
  })

  const firstName = customer?.fullName?.split(' ')[0] || 'Guest'
  const inStock = products.filter((p) => p.stock > 0)
  const counts = {}
  const firstImage = {}
  for (const p of products) {
    counts[p.category] = (counts[p.category] || 0) + 1
    if (!firstImage[p.category] && p.image) firstImage[p.category] = p.image
  }
  // Popular right now: most frequent meaningful words in live product names —
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
  const freshPicks = [...inStock].slice(0, 10)
  const valuePick = [...inStock].sort((a, b) => a.price - b.price)[0] || null
  // Hero collage: three real in-stock products, spread across the catalog.
  const heroes = [inStock[2], inStock[7], inStock[12]].filter(Boolean)
  const heroTiles = heroes.length === 3 ? heroes : inStock.slice(0, 3)

  return (
    <div>
      <Navbar />
      <main className="shop home" id="main">
        <section className="hero" aria-label="Welcome to ShopKart">
          <div className="hero-grid">
            <div>
              <p className="hero-kicker">Namaste, {firstName} · The everyday store</p>
              <h1 className="hero-title">Good things for every corner of <em>home.</em></h1>
              <p className="hero-sub">
                {products.length > 0
                  ? `${products.length} finds across ${Object.keys(counts).length} aisles — live prices, live stock, no surprises at checkout.`
                  : 'Four aisles of everyday finds — picked for everyday India.'}
              </p>
              <div className="hero-actions">
                <Link to="/products" className="btn btn-primary inline-btn">Shop the shelves →</Link>
                <Link to="/wishlist" className="btn btn-outline">My wishlist ♥</Link>
              </div>
              {products.length > 0 && (
                <div className="hero-stats" aria-label="Store snapshot">
                  <div className="hero-stat"><strong>{products.length}</strong><span>finds</span></div>
                  <div className="hero-stat"><strong>{Object.keys(counts).length}</strong><span>aisles</span></div>
                  <div className="hero-stat"><strong>{inStock.length}</strong><span>in stock</span></div>
                </div>
              )}
              {trending.length > 0 && (
                <div className="trend-row" aria-label="Popular right now">
                  {trending.map((w) => (
                    <Link key={w} to={`/products?search=${encodeURIComponent(w)}`} className="trend-chip">
                      {w} <small>→</small>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {heroTiles.length === 3 && (
              <div className="hero-collage" aria-label="Featured products">
                <Link to={`/products/${heroTiles[0]._id}`} className="hero-card tall" aria-label={`View ${heroTiles[0].name}`}>
                  <SafeImage src={heroTiles[0].image} alt="" />
                  <span className="hero-tag"><span>{heroTiles[0].name}</span><span>{inr(heroTiles[0].price)}</span></span>
                </Link>
                <Link to={`/products/${heroTiles[1]._id}`} className="hero-card a" aria-label={`View ${heroTiles[1].name}`}>
                  <SafeImage src={heroTiles[1].image} alt="" />
                  <span className="hero-tag"><span>{heroTiles[1].name}</span><span>{inr(heroTiles[1].price)}</span></span>
                </Link>
                <Link to={`/products/${heroTiles[2]._id}`} className="hero-card b" aria-label={`View ${heroTiles[2].name}`}>
                  <SafeImage src={heroTiles[2].image} alt="" />
                  <span className="hero-tag"><span>{heroTiles[2].name}</span><span>{inr(heroTiles[2].price)}</span></span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {loading && (
          <>
            <p className="loading">Setting up the shelves...</p>
            <SkeletonGrid count={8} />
          </>
        )}
        {!loading && err && (
          <div className="empty">
            <p className="empty-title">The shelves are unreachable.</p>
            <p className="empty-sub">{err}</p>
            <button type="button" className="btn btn-primary inline-btn" onClick={() => setRetryTick((t) => t + 1)}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !err && (
          <>
            <Reveal as="section" aria-label="Shop by category">
              <div className="sec-head">
                <div>
                  <p className="sec-kicker">Aisles</p>
                  <h2 className="sec-title">Wander by <em>mood.</em></h2>
                </div>
                <Link to="/products" className="sec-link">View all →</Link>
              </div>
              <div className="aisle-grid">
                {AISLES.map((a) => (
                  <Link
                    key={a.name}
                    to={`/products?category=${encodeURIComponent(a.name)}`}
                    className="aisle-tile"
                  >
                    {firstImage[a.name] && (
                      <SafeImage src={firstImage[a.name]} alt="" className="aisle-photo" />
                    )}
                    <span className="aisle-go" aria-hidden="true">→</span>
                    <strong>{a.name}</strong>
                    <span className="aisle-tag">{a.tagline}</span>
                    <span className="aisle-count big">{counts[a.name] || 0} finds</span>
                  </Link>
                ))}
              </div>
            </Reveal>

            {valuePick && (
              <Reveal as="section" className="steal" aria-label="Great value pick">
                <div className="steal-badge">Great value pick · Lowest price in stock</div>
                <div className="steal-body">
                  <SafeImage src={valuePick.image} alt={valuePick.name} />
                  <div>
                    <p className="product-category">{valuePick.category}</p>
                    <h3>{valuePick.name}</h3>
                    <p className="details-price">{inr(valuePick.price)}</p>
                    <p className="product-stock"><span className="stock-dot" aria-hidden="true" />{valuePick.stock} in stock</p>
                    <div className="steal-actions">
                      <button
                        type="button"
                        className="btn btn-primary inline-btn"
                        disabled={cartPending.has(valuePick._id)}
                        onClick={() => handleAdd(valuePick._id, valuePick.name)}
                      >
                        {cartPending.has(valuePick._id) ? 'Adding...' : 'Add to Cart'}
                      </button>
                      <Link to={`/products/${valuePick._id}`} className="btn btn-outline">View Details</Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            {freshPicks.length > 0 && (
              <Reveal as="section" aria-label="Fresh picks">
                <div className="sec-head">
                  <div>
                    <p className="sec-kicker">Just shelved</p>
                    <h2 className="sec-title">Fresh picks, <em>in stock now.</em></h2>
                  </div>
                  <Link to="/products" className="sec-link">View all →</Link>
                </div>
                <Rail label="Fresh picks">
                  {freshPicks.map((product, i) => (
                    <ProductCard key={product._id} {...cardProps(product, i)} />
                  ))}
                </Rail>
              </Reveal>
            )}

            <Reveal as="section" className="closer" aria-label="Keep browsing">
              <h2>Still looking? The shelves <em>go on.</em></h2>
              <p>Search {products.length} finds, filter by aisle and price, and check out securely when something catches your eye.</p>
              <Link to="/products" className="btn btn-primary inline-btn">Browse everything →</Link>
            </Reveal>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Home
