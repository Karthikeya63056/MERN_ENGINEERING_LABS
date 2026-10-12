import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
            <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Shop</NavLink>
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
