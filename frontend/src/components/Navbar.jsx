import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getWishlist } from '../services/wishlist'
import SearchBar from './SearchBar'

const CATS = ['Electronics', 'Fashion', 'Books', 'Home']

// Sticky store header: brand · global search · account · wishlist/cart counts.
// Mobile gets a search toggle + hamburger drawer; category strip stays
// reachable everywhere. Counts always come from backend-backed state.
function Navbar() {
  const { user, logout } = useAuth()
  const { count: cartCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [wishCount, setWishCount] = useState(0)
  const [drawer, setDrawer] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [popKey, setPopKey] = useState(0)
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef(null)

  // Wishlist count mirrors the backend; failures keep the last known value.
  useEffect(() => {
    if (!user) {
      setWishCount(0)
      return
    }
    let live = true
    const refresh = () => {
      getWishlist()
        .then((data) => { if (live) setWishCount(data.count || 0) })
        .catch(() => {})
    }
    refresh()
    window.addEventListener('wishlist:changed', refresh)
    return () => {
      live = false
      window.removeEventListener('wishlist:changed', refresh)
    }
  }, [user])

  // Animate the cart badge whenever the real count changes.
  useEffect(() => {
    if (cartCount > 0) setPopKey((k) => k + 1)
  }, [cartCount])

  // Close overlays on navigation + Escape.
  useEffect(() => {
    setDrawer(false)
    setMobileSearch(false)
    setAcctOpen(false)
  }, [location.pathname, location.search])
  // Account menu: close on outside click or Escape.
  useEffect(() => {
    if (!acctOpen) return
    const onDoc = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setAcctOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [acctOpen])
  useEffect(() => {
    if (!drawer && !mobileSearch) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDrawer(false)
        setMobileSearch(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer, mobileSearch])

  const activeCat = new URLSearchParams(location.search).get('category')

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const linkCls = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to={user ? '/home' : '/login'} className="brand" aria-label="ShopKart home">
            <span className="brand-mark" aria-hidden="true" />
            ShopKart
          </Link>

          {user && (
            <div style={{ display: 'contents' }}>
              <SearchBar variant="header" />
            </div>
          )}

          <nav className="nav-links desktop" aria-label="Primary">
            {user ? (
              <>
                <NavLink to="/home" className={linkCls}>Home</NavLink>
                <NavLink to="/products" className={linkCls}>Products</NavLink>
                <NavLink to="/wishlist" className={linkCls}>
                  Wishlist{wishCount > 0 && <span className="count-badge">{wishCount}</span>}
                </NavLink>
                <NavLink to="/cart" className={linkCls}>
                  Cart{cartCount > 0 && <span key={popKey} className="count-badge pop">{cartCount}</span>}
                </NavLink>
                <NavLink to="/orders" className={linkCls}>Orders</NavLink>
                <div className="avatar-chip acct" ref={acctRef}>
                  <button
                    type="button"
                    className="acct-btn"
                    onClick={() => setAcctOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={acctOpen}
                    aria-label={`Account menu for ${user.fullName}`}
                  >
                    <span className="avatar" aria-hidden="true">{user.fullName?.charAt(0)?.toUpperCase()}</span>
                    <span className="nav-user">{user.fullName}</span>
                    <span className="acct-caret" aria-hidden="true">▾</span>
                  </button>
                  {acctOpen && (
                    <div className="acct-menu" role="menu" aria-label="Account">
                      <p className="acct-meta">Signed in as<br /><strong>{user.fullName}</strong></p>
                      <Link to="/account" className="acct-link" role="menuitem">
                        My profile <span aria-hidden="true">→</span>
                      </Link>
                      <Link to="/change-password" className="acct-link" role="menuitem">
                        Change password <span aria-hidden="true">→</span>
                      </Link>
                      <button type="button" className="btn btn-outline acct-logout" role="menuitem" onClick={handleLogout}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="btn btn-primary">Register</Link>
              </>
            )}
          </nav>

          {user && (
            <>
              <button
                type="button"
                className="search-toggle"
                aria-label={mobileSearch ? 'Close search' : 'Open search'}
                aria-expanded={mobileSearch}
                onClick={() => { setMobileSearch((v) => !v); setDrawer(false) }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="menu-btn"
                aria-label={drawer ? 'Close menu' : 'Open menu'}
                aria-expanded={drawer}
                onClick={() => { setDrawer((v) => !v); setMobileSearch(false) }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  {drawer
                    ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>
                    : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
                </svg>
              </button>
            </>
          )}
        </div>

        {user && mobileSearch && (
          <div className="header-search open">
            <SearchBar variant="header" autoFocus onSubmitted={() => setMobileSearch(false)} />
          </div>
        )}

        {user && (
          <nav className="cat-strip" aria-label="Categories">
            <div className="cat-strip-inner">
              <Link to="/products" className={!activeCat ? 'cat-link active' : 'cat-link'}>All</Link>
              {CATS.map((c) => (
                <Link
                  key={c}
                  to={`/products?category=${encodeURIComponent(c)}`}
                  className={activeCat === c ? 'cat-link active' : 'cat-link'}
                >
                  {c}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {user && drawer && (
        <>
          <button type="button" className="drawer-scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <nav className="drawer" aria-label="Mobile navigation">
            <div className="drawer-head">
              <p className="drawer-title">ShopKart</p>
              <button type="button" className="drawer-close" aria-label="Close menu" onClick={() => setDrawer(false)}>✕</button>
            </div>
            <NavLink to="/home" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>Home <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/products" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>Products <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/wishlist" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>
              <span>Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}</span><span aria-hidden="true">→</span>
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>
              <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span><span aria-hidden="true">→</span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>Orders <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/change-password" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>Change password <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/account" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>My profile <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/checkout" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>Checkout <span aria-hidden="true">→</span></NavLink>
            <div className="drawer-head" style={{ marginTop: 12 }}>
              <p className="drawer-title" style={{ fontSize: 15 }}>Categories</p>
            </div>
            {CATS.map((c) => (
              <Link key={c} to={`/products?category=${encodeURIComponent(c)}`} className="drawer-link">
                {c} <span aria-hidden="true">→</span>
              </Link>
            ))}
            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <p className="ledger-sub" style={{ marginBottom: 8 }}>Signed in as {user.fullName}</p>
              <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  )
}

export default Navbar
