import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getWishlist } from '../services/wishlist'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [wishCount, setWishCount] = useState(0)

  // Count always comes from the backend — never hardcoded.
  // Refreshes on navigation AND immediately after any wishlist mutation
  // (the service emits 'wishlist:changed'). Failures keep the last
  // known count rather than flashing a wrong zero.
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
  }, [user, location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navbar">
      <Link to={user ? '/home' : '/login'} className="brand">
        <span className="brand-mark" />
        ShopKart
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <NavLink to="/home" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
            <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Products</NavLink>
            <NavLink to="/wishlist" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}
            </NavLink>
            <div className="avatar-chip">
            <div className="avatar">{user.fullName?.charAt(0)?.toUpperCase()}</div>
            <span className="nav-user">{user.fullName}</span>
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              Logout
            </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
