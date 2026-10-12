import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWishlist, removeFromWishlist } from '../services/wishlist'
import Navbar from '../components/Navbar'
import WishlistCard from '../components/WishlistCard'

function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [removeErr, setRemoveErr] = useState('')
  const [removingIds, setRemovingIds] = useState(new Set())

  const fetchWishlist = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await getWishlist()
      setItems(data.wishlist || [])
    } catch (error) {
      console.log(error)
      setErr('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const handleRemove = async (productId) => {
    if (removingIds.has(productId)) return
    setRemoveErr('')
    setRemovingIds((prev) => new Set(prev).add(productId))
    try {
      await removeFromWishlist(productId)
      setItems((prev) => prev.filter((p) => p._id !== productId))
    } catch (error) {
      console.log(error)
      // Non-destructive: the grid stays, only a notice appears.
      setRemoveErr("We couldn't remove that product. Please try again.")
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  return (
    <div>
      <Navbar />
      <main className="shop">
        <p className="eyebrow left">Saved for later</p>
        <h1 className="shop-title">My Wishlist</h1>

        {loading && (
          <>
            <p className="loading">Loading your wishlist...</p>
            <div className="product-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="skel-card">
                  <div className="skel skel-img" />
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && err && (
          <div className="empty">
            <p className="empty-title">Something went wrong.</p>
            <p className="empty-sub">We couldn&apos;t load your wishlist.</p>
            <button type="button" className="btn btn-primary inline-btn" onClick={fetchWishlist}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="empty">
            <svg className="empty-heart" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="empty-title">Your wishlist is empty</p>
            <p className="empty-sub">Save products you love and find them here later.</p>
            <Link to="/products" className="btn btn-primary inline-btn">Browse Products</Link>
          </div>
        )}

        {!loading && !err && removeErr && (
          <p className="notice" role="alert">{removeErr}</p>
        )}

        {!loading && !err && items.length > 0 && (
          <>
            <p className="shop-sub wish-count">
              {items.length} product{items.length === 1 ? '' : 's'} saved
            </p>
            <div className="product-grid">
              {items.map((product, i) => (
                <WishlistCard
                  key={product._id}
                  product={product}
                  index={i}
                  removing={removingIds.has(product._id)}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Wishlist
