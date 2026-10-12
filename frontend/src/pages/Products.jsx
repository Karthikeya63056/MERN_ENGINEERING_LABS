import { useEffect, useState } from 'react'
import api from '../services/api'
import { getWishlist, toggleWishlist } from '../services/wishlist'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'

function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [sort, setSort] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [counts, setCounts] = useState({})
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
    } catch (error) {
      console.log(error)
      setWishErrors((prev) => ({ ...prev, [productId]: true }))
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const AISLES = ['All', 'Electronics', 'Fashion', 'Books', 'Home']

  const totalCount = Object.values(counts).reduce((s, v) => s + v, 0)
  const hasFilters = search.trim() !== '' || category !== 'All Categories' || sort !== ''

  // One unfiltered fetch for the aisle counts shown on the pills.
  useEffect(() => {
    let live = true
    api.get('/products')
      .then((res) => {
        if (!live) return
        const c = {}
        for (const p of res.data.products || []) c[p.category] = (c[p.category] || 0) + 1
        setCounts(c)
      })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // Wishlist ids come from the backend — the source of truth, not local state.
  // A failure here is shown (with retry) instead of silently leaving
  // every heart in the wrong state.
  const [wishStatusErr, setWishStatusErr] = useState(false)
  const [wishStatusTries, setWishStatusTries] = useState(0)

  useEffect(() => {
    let live = true
    getWishlist()
      .then((data) => {
        if (!live) return
        setSavedIds(new Set((data.wishlist || []).map((p) => p._id)))
        setWishStatusErr(false)
      })
      .catch(() => { if (live) setWishStatusErr(true) })
    return () => { live = false }
  }, [wishStatusTries])

  // Backend does the filtering — React only holds the input state.
  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      setLoading(true)
      setErr('')
      try {
        const params = {}
        if (search.trim()) params.search = search.trim()
        if (category !== 'All Categories') params.category = category
        if (sort) params.sort = sort
        const response = await api.get('/products', { params })
        if (!cancelled) setProducts(response.data.products || [])
      } catch (error) {
        console.log(error)
        if (!cancelled) setErr('Something went wrong while loading products.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Small debounce so we don't fire a request on every keystroke.
    const timer = setTimeout(fetchProducts, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, category, sort])

  return (
    <div>
      <Navbar />
      <main className="shop">
        <div className="masthead">
          <div>
            <p className="eyebrow left">The shelves</p>
            <h1 className="shop-title">Everything in the store</h1>
            <p className="shop-sub">A hundred goods, four aisles — picked for everyday India.</p>
          </div>
          <p className="shop-count" aria-live="polite">
            {!loading && !err ? `${products.length} item${products.length === 1 ? '' : 's'}` : '···'}
          </p>
        </div>

        <div className="aisles" role="navigation" aria-label="Browse aisles">
          {AISLES.map((a) => {
            const value = a === 'All' ? 'All Categories' : a
            const active = category === value
            const n = a === 'All' ? totalCount : (counts[a] || 0)
            return (
              <button
                key={a}
                type="button"
                className={active ? 'aisle active' : 'aisle'}
                aria-pressed={active}
                onClick={() => setCategory(value)}
              >
                {a}
                {n > 0 && <span className="aisle-count">{n}</span>}
              </button>
            )
          })}
        </div>

        <SearchBar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          sort={sort}
          onSortChange={setSort}
        />

        {loading && (
          <>
            <p className="loading">Loading products...</p>
            <div className="product-grid" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div key={n} className="skel-card">
                  <div className="skel skel-img" />
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && err && <p className="error">{err}</p>}

        {!loading && !err && wishStatusErr && (
          <p className="notice">
            Couldn&apos;t load your wishlist status — hearts may look unsaved.{' '}
            <button type="button" className="notice-btn" onClick={() => setWishStatusTries((t) => t + 1)}>
              Retry
            </button>
          </p>
        )}

        {!loading && !err && products.length === 0 && (
          <div className="empty">
            <p className="empty-title">No products found.</p>
            <p className="empty-sub">Try a different search, or browse the full shelves.</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setSearch(''); setCategory('All Categories'); setSort('') }}
            >
              Clear search &amp; filters
            </button>
          </div>
        )}

        {!loading && !err && (
          <div className="results-row">
            <p className="results-line" aria-live="polite">
              Showing <strong>{products.length}</strong>
              {totalCount > 0 && <> of <strong>{totalCount}</strong></>}
            </p>
            {hasFilters && (
              <div className="chips">
                {search.trim() !== '' && (
                  <button type="button" className="chip" onClick={() => setSearch('')}>
                    “{search.trim()}” <span aria-hidden="true">×</span>
                  </button>
                )}
                {category !== 'All Categories' && (
                  <button type="button" className="chip" onClick={() => setCategory('All Categories')}>
                    {category} <span aria-hidden="true">×</span>
                  </button>
                )}
                {sort !== '' && (
                  <button type="button" className="chip" onClick={() => setSort('')}>
                    {sort === 'price_asc' ? 'Low to High' : 'High to Low'} <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && !err && products.length > 0 && (
          <div className="product-grid">
            {products.map((product, i) => (
              <ProductCard
                key={product._id}
                product={product}
                index={i}
                saved={savedIds.has(product._id)}
                saving={savingIds.has(product._id)}
                wishError={wishErrors[product._id] ? true : ''}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Products
