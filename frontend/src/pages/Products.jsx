import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { warnApi } from '../services/api'
import { getWishlist, toggleWishlist } from '../services/wishlist'
import { useCart } from '../context/CartContext'
import { useToast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'
import { Breadcrumbs, EmptyState, ErrorState, SkeletonGrid } from '../components/ui'

const VALID_AISLES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home']
const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '500', label: 'Under ₹500' },
  { value: '1000', label: 'Under ₹1,000' },
  { value: '5000', label: 'Under ₹5,000' },
]

// Data flow: search/category/sort run on the backend (GET /products?…).
// maxPrice + in-stock-only refine the returned set client-side — they only
// ever hide rows, never invent them. Stale responses are dropped by req id.
function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const urlCategory = VALID_AISLES.includes(searchParams.get('category'))
    ? searchParams.get('category')
    : 'All Categories'

  const [products, setProducts] = useState([])
  const [search, setSearch] = useState(urlSearch)
  const [category, setCategory] = useState(urlCategory)
  const [sort, setSort] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [retryTick, setRetryTick] = useState(0)
  const [counts, setCounts] = useState({})
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())
  const [wishErrors, setWishErrors] = useState({})
  const { addItem: addToCart, pendingIds: cartPending, itemErrors: cartErrors } = useCart()
  const { notify, notifyError } = useToast()
  const reqId = useRef(0)

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
      warnApi('products:wishlist', error)
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

  const AISLES = ['All', 'Electronics', 'Fashion', 'Books', 'Home']
  const totalCount = Object.values(counts).reduce((s, v) => s + v, 0)

  // Adopt deep links (header search, home tiles, footer) when the URL changes.
  useEffect(() => {
    setSearch((s) => (s === urlSearch ? s : urlSearch))
    setCategory((c) => (c === urlCategory ? c : urlCategory))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch, urlCategory])

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
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      setErr('')
      try {
        const params = {}
        if (search.trim()) params.search = search.trim()
        if (category !== 'All Categories') params.category = category
        if (sort) params.sort = sort
        const response = await api.get('/products', { params })
        if (reqId.current !== id) return
        setProducts(response.data.products || [])
      } catch (error) {
        warnApi('products:list', error)
        if (reqId.current === id) setErr('Something went wrong while loading products.')
      } finally {
        if (reqId.current === id) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [search, category, sort, retryTick])

  // Keep the URL shareable without fighting the inputs above.
  useEffect(() => {
    const next = {}
    if (search.trim()) next.search = search.trim()
    if (category !== 'All Categories') next.category = category
    const cur = Object.fromEntries([...searchParams])
    if (JSON.stringify(cur) !== JSON.stringify(next)) {
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category])

  // Client-side refinement of the returned set (real data only).
  const visible = useMemo(() => {
    let rows = products
    if (inStockOnly) rows = rows.filter((p) => p.stock > 0)
    if (maxPrice !== '') rows = rows.filter((p) => p.price <= Number(maxPrice))
    return rows
  }, [products, inStockOnly, maxPrice])

  const hasFilters = search.trim() !== '' || category !== 'All Categories' || sort !== '' || maxPrice !== '' || inStockOnly
  const clearAll = () => {
    setSearch('')
    setCategory('All Categories')
    setSort('')
    setMaxPrice('')
    setInStockOnly(false)
  }

  const filterControls = (
    <>
      <label className="select-wrap" aria-label="Maximum price">
        <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Filter by maximum price">
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </label>
      <label className="stock-toggle">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
        />
        In stock only
      </label>
    </>
  )

  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <Breadcrumbs trail={[{ label: 'Home', to: '/home' }, { label: 'Products' }]} />
        <div className="masthead">
          <div>
            <p className="eyebrow left">The shelves</p>
            <h1 className="shop-title">Everything in the store</h1>
            <p className="shop-sub">Live prices and stock, straight from the catalog.</p>
          </div>
          <p className="shop-count" aria-live="polite">
            {!loading && !err ? `${visible.length} item${visible.length === 1 ? '' : 's'}` : '···'}
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

        <div className="filter-row">
          <button type="button" className="btn btn-outline filter-toggle" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            Filters{hasFilters ? ' •' : ''}
          </button>
          <div className="filter-row filter-inline" style={{ marginBottom: 0 }}>
            {filterControls}
          </div>
        </div>

        {loading && (
          <>
            <p className="loading">Loading products...</p>
            <SkeletonGrid count={8} />
          </>
        )}

        {!loading && err && <ErrorState sub={err} onRetry={() => setRetryTick((t) => t + 1)} />}

        {!loading && !err && wishStatusErr && (
          <p className="notice">
            Couldn&apos;t load your wishlist status — hearts may look unsaved.{' '}
            <button type="button" className="notice-btn" onClick={() => setWishStatusTries((t) => t + 1)}>
              Retry
            </button>
          </p>
        )}

        {!loading && !err && visible.length === 0 && (
          <EmptyState
            title={products.length === 0 ? 'No products found.' : 'Nothing matches those filters.'}
            sub={products.length === 0
              ? 'Try a different search, or browse the full shelves.'
              : 'Loosen the price or availability filters to see more.'}
          />
        )}

        {!loading && !err && visible.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={clearAll}>
              Clear search &amp; filters
            </button>
          </div>
        )}

        {!loading && !err && visible.length > 0 && (
          <div className="results-row">
            <p className="results-line" aria-live="polite">
              Showing <strong>{visible.length}</strong>
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
                {maxPrice !== '' && (
                  <button type="button" className="chip" onClick={() => setMaxPrice('')}>
                    Under ₹{Number(maxPrice).toLocaleString('en-IN')} <span aria-hidden="true">×</span>
                  </button>
                )}
                {inStockOnly && (
                  <button type="button" className="chip" onClick={() => setInStockOnly(false)}>
                    In stock only <span aria-hidden="true">×</span>
                  </button>
                )}
                <button type="button" className="chip" onClick={clearAll}>
                  Clear all <span aria-hidden="true">×</span>
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !err && visible.length > 0 && (
          <div className="product-grid">
            {visible.map((product, i) => (
              <ProductCard
                key={product._id}
                product={product}
                index={i}
                saved={savedIds.has(product._id)}
                saving={savingIds.has(product._id)}
                wishError={wishErrors[product._id] ? true : ''}
                onToggleWishlist={handleToggleWishlist}
                onAddToCart={async (id) => {
                  const failure = await addToCart(id)
                  if (failure === null) notify(`Added “${product.name}” to your cart.`)
                  else if (failure) notifyError(failure)
                }}
                adding={cartPending.has(product._id)}
                cartError={cartErrors[product._id] || ''}
              />
            ))}
          </div>
        )}
      </main>

      {filtersOpen && (
        <>
          <button type="button" className="drawer-scrim" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="drawer left" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="drawer-head">
              <p className="drawer-title">Filters</p>
              <button type="button" className="drawer-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filterControls}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setFiltersOpen(false)}>
                Show {visible.length} result{visible.length === 1 ? '' : 's'}
              </button>
              <button type="button" className="btn btn-outline" onClick={clearAll}>
                Reset
              </button>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  )
}

export default Products
