import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const CATEGORIES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home']

// Page variant: controlled filters owned by the Products page (unchanged API).
// Header variant: self-contained global search — typing navigates to
// /products?search=…, suggestions come from the real GET /products endpoint.
function SearchBar({
  search, onSearchChange, category, onCategoryChange, sort, onSortChange,
  variant = 'page', autoFocus = false, onSubmitted,
}) {
  if (variant === 'header') return <HeaderSearch autoFocus={autoFocus} onSubmitted={onSubmitted} />

  return (
    <div className="search-bar" role="search">
      <div className="search-field">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
        />
      </div>
      <div className="select-wrap">
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="select-wrap">
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label="Sort by price">
          <option value="">Sort: Featured</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

function HeaderSearch({ autoFocus, onSubmitted }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const reqId = useRef(0)
  const boxRef = useRef(null)

  // Debounced suggestions from the real catalog endpoint. Stale responses
  // are dropped via request id so slow replies never overwrite newer ones.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setItems([])
      setOpen(false)
      return
    }
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { search: term } })
        if (reqId.current !== id) return
        setItems((res.data.products || []).slice(0, 6))
        setOpen(true)
        setHighlight(-1)
      } catch {
        if (reqId.current === id) {
          setItems([])
          setOpen(false)
        }
      }
    }, 280)
    return () => clearTimeout(timer)
  }, [q])

  // Close on outside click / Escape.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const go = (term) => {
    const t = (term ?? q).trim()
    setOpen(false)
    onSubmitted?.()
    if (!t) navigate('/products')
    else navigate(`/products?search=${encodeURIComponent(t)}`)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + items.length) % items.length)
    } else if (e.key === 'Enter' && highlight >= 0 && items[highlight]) {
      e.preventDefault()
      navigate(`/products/${items[highlight]._id}`)
      setOpen(false)
      onSubmitted?.()
    }
  }

  return (
    <div className="header-search" role="search" ref={boxRef}>
      <div className="search-field">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => { if (items.length > 0) setOpen(true) }}
          placeholder="Search for products…"
          aria-label="Search products"
          aria-expanded={open}
          aria-controls="header-suggest"
          role="combobox"
          aria-autocomplete="list"
        />
      </div>
      {open && (
        <div className="suggest" id="header-suggest" role="listbox" aria-label="Search suggestions">
          {items.length === 0 ? (
            <p className="suggest-empty">No matches — press Enter to search anyway.</p>
          ) : (
            items.map((p, i) => (
              <button
                key={p._id}
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={i === highlight ? 'suggest-item highlight' : 'suggest-item'}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  navigate(`/products/${p._id}`)
                  setOpen(false)
                  onSubmitted?.()
                }}
              >
                <img src={p.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                <span>{p.name}</span>
                <span className="suggest-price">₹{(p.price || 0).toLocaleString('en-IN')}</span>
              </button>
            ))
          )}
          <button type="button" className="suggest-item" onClick={() => go()}>
            <span>Search for “{q.trim()}” →</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchBar
