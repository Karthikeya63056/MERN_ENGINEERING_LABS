import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { getWishlist, toggleWishlist } from '../services/wishlist'
import { useCart } from '../context/CartContext'
import { useToast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { Breadcrumbs, ErrorState, SafeImage, inr } from '../components/ui'

// Only real backend fields are rendered: name · category · price ·
// description · image · stock. (The catalog has no ratings, review counts,
// discounts or delivery promises, so none are shown.)
function ProductDetails() {
  const { id } = useParams()
  const { addItem: addToCart, pendingIds: cartPending, itemErrors: cartErrors } = useCart()
  const { notify, notifyError } = useToast()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())
  const [wishErrors, setWishErrors] = useState({})

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
    } catch (error) {
      console.log(error)
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

  const saved = product ? savedIds.has(product._id) : false
  const saving = product ? savingIds.has(product._id) : false

  useEffect(() => {
    let live = true
    const fetchProduct = async () => {
      setLoading(true)
      setErr('')
      setRelated([])
      try {
        const response = await api.get(`/products/${id}`)
        if (!live) return
        setProduct(response.data.product)
        try {
          const wishlist = await getWishlist()
          if (live) setSavedIds(new Set((wishlist.wishlist || []).map((p) => p._id)))
        } catch {
          if (live) setSavedIds(new Set())
        }
      } catch (error) {
        console.log(error)
        if (!live) return
        if (error.response?.status === 404) {
          setErr('Product not found.')
        } else {
          setErr('Something went wrong while loading this product.')
        }
      } finally {
        if (live) setLoading(false)
      }
    }
    fetchProduct()
    return () => { live = false }
  }, [id])

  // Same aisle, minus this one — the classic "pairs well with" shelf.
  useEffect(() => {
    if (!product) return
    let live = true
    api.get('/products', { params: { category: product.category } })
      .then((res) => {
        if (!live) return
        setRelated((res.data.products || []).filter((p) => p._id !== product._id).slice(0, 4))
      })
      .catch(() => {})
    return () => { live = false }
  }, [product])

  const outOfStock = product?.stock === 0
  const low = product && !outOfStock && product.stock <= 5

  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <Breadcrumbs trail={[
          { label: 'Home', to: '/home' },
          { label: 'Products', to: '/products' },
          { label: product && !err ? product.name : 'Details' },
        ]} />

        {loading && <p className="loading">Loading product...</p>}

        {!loading && err && <ErrorState title={err} sub="It may have been removed, or the address is wrong." />}

        {!loading && !err && product && (
          <>
          <div className="details">
            <div className="gallery">
              <SafeImage src={product.image} alt={product.name} className="details-image" loading="eager" />
              <p className="gallery-note">Image shown as supplied in the catalog.</p>
            </div>
            <div className="details-body">
              <p className="eyebrow left">{product.category} · In-store now</p>
              <h1 className="details-name">{product.name}</h1>
              <p className="details-price">{inr(product.price)}</p>
              <p className="details-desc">{product.description}</p>
              <p className={outOfStock ? 'product-stock empty' : low ? 'product-stock low' : 'product-stock'}>
                <span className="stock-dot" aria-hidden="true" />
                {outOfStock
                  ? 'Currently unavailable'
                  : low
                    ? `Only ${product.stock} units left in stock`
                    : `${product.stock} units in stock`}
              </p>
              {product.stock > 0 && (
                <div className="stock-meter" role="img" aria-label={`${product.stock} units in stock`}>
                  <div
                    className={low ? 'stock-fill low' : 'stock-fill'}
                    style={{ width: `${Math.min(100, Math.max(6, (product.stock / 30) * 100))}%` }}
                  />
                </div>
              )}
              <div className="details-actions">
                <button
                  type="button"
                  className="btn btn-primary details-cta"
                  disabled={product.stock === 0 || cartPending.has(product._id)}
                  onClick={async () => {
                    await addToCart(product._id)
                    notify(`Added “${product.name}” to your cart.`)
                  }}
                >
                  {cartPending.has(product._id) ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  type="button"
                  className={saved ? 'btn btn-wish saved' : 'btn btn-wish'}
                  disabled={saving}
                  onClick={() => handleToggleWishlist(product._id)}
                  aria-pressed={saved}
                >
                  {saving ? 'Saving...' : saved ? '♥ Added to Wishlist' : '♡ Add to Wishlist'}
                </button>
              </div>
              {product && wishErrors[product._id] && <p className="wish-error">Unable to save product. Please try again.</p>}
              {cartErrors[product._id] && <p className="wish-error" role="alert">{cartErrors[product._id]}</p>}
              <p className="assurance left">Stock and price are re-verified on the server at checkout.</p>
            </div>
          </div>
          {/* Sticky mobile purchase bar — same real action, reachable thumb. */}
          <div className="buybar" aria-label="Quick purchase">
            <span className="buybar-price">{inr(product.price)}</span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={product.stock === 0 || cartPending.has(product._id)}
              onClick={async () => {
                await addToCart(product._id)
                notify(`Added “${product.name}” to your cart.`)
              }}
            >
              {cartPending.has(product._id) ? 'Adding...' : product.stock === 0 ? 'Unavailable' : 'Add to Cart'}
            </button>
          </div>
          <div className="buybar-spacer" aria-hidden="true" />
          </>
        )}

        {!loading && !err && related.length > 0 && (
          <section className="related">
            <div className="sec-head">
              <div>
                <p className="sec-kicker">Same aisle</p>
                <h2 className="sec-title">Pairs <em>well with.</em></h2>
              </div>
              <Link to="/products" className="sec-link">View all →</Link>
            </div>
            <div className="product-grid">
              {related.map((p, i) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  index={i}
                  saved={savedIds.has(p._id)}
                  saving={savingIds.has(p._id)}
                  wishError={wishErrors[p._id] ? true : ''}
                  onToggleWishlist={handleToggleWishlist}
                  onAddToCart={async (pid) => {
                    await addToCart(pid)
                    notify(`Added “${p.name}” to your cart.`)
                  }}
                  adding={cartPending.has(p._id)}
                  cartError={cartErrors[p._id] || ''}
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetails
