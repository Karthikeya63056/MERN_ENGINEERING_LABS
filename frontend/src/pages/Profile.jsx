import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Breadcrumbs } from '../components/ui'

// Personal Atelier: the member's own space. Everything shown comes from
// GET /customers/me (fullName, email, phone) — nothing else exists to show.
// There is no profile-update endpoint, so details are read-only by design;
// password changes live on /change-password.
const ACCOUNT_LINKS = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/orders', label: 'Orders', end: false },
  { to: '/wishlist', label: 'Wishlist', end: false },
  { to: '/change-password', label: 'Change password', end: false },
]

function ProfileSkeleton() {
  return (
    <div className="atelier" aria-hidden="true">
      <div className="skel skel-atnav" />
      <div className="atelier-main">
        <div className="skel skel-atline" />
        <div className="skel skel-atline short" />
        <div className="skel-card" style={{ marginTop: 18 }}>
          <div className="skel skel-line" />
          <div className="skel skel-line" />
          <div className="skel skel-line short" />
        </div>
      </div>
    </div>
  )
}

function Profile() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <Breadcrumbs trail={[{ label: 'Home', to: '/home' }, { label: 'My profile' }]} />

        {loading && (
          <>
            <p className="loading">Opening your space...</p>
            <ProfileSkeleton />
          </>
        )}

        {!loading && user && <Atelier user={user} onLogout={handleLogout} />}

        {!loading && !user && (
          <div className="empty">
            <p className="empty-title">You need to sign in to see this space.</p>
            <p className="empty-sub">Your profile lives behind your login.</p>
            <Link to="/login" className="btn btn-primary inline-btn">Log in</Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Atelier({ user, onLogout }) {
  const firstName = user.fullName?.split(' ')[0] || 'there'
  const initial = user.fullName?.trim().charAt(0)?.toUpperCase() || 'S'
  const details = [
    { label: 'Full name', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone },
  ]

  return (
    <div className="atelier">
      <aside className="atelier-side" aria-label="Account navigation">
        <div className="atelier-id">
          <span className="atelier-avatar" aria-hidden="true">{initial}</span>
          <p className="atelier-who">
            <strong>{user.fullName || 'ShopKart member'}</strong>
            <span>{user.email || ''}</span>
          </p>
        </div>
        <nav aria-label="Account sections">
          {ACCOUNT_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'atelier-link active' : 'atelier-link')}
            >
              {l.label}
              <span aria-hidden="true">→</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn btn-outline atelier-logout" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <div className="atelier-main">
        <header className="atelier-hero">
          <p className="eyebrow left atelier-eyebrow">Your space</p>
          <h1 className="atelier-title">Hello, <em>{firstName}.</em></h1>
          <p className="shop-sub">
            Everything about your account, in one calm place.
          </p>
        </header>

        <section className="atelier-card" aria-label="Personal details">
          <div className="atelier-cardhead">
            <h2>Personal details</h2>
            <span className="atelier-flag">Read-only</span>
          </div>
          <dl>
            {details.map((d) => (
              <div key={d.label} className="atelier-row">
                <dt>{d.label}</dt>
                <dd>{d.value || '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="summary-note">
            Names, emails, and phone numbers can't be edited online yet —
            only password changes are supported.
          </p>
        </section>

        <section className="atelier-card" aria-label="Security">
          <div className="atelier-cardhead">
            <h2>Security</h2>
          </div>
          <dl>
            <div className="atelier-row">
              <dt>Password</dt>
              <dd aria-label="Password hidden">••••••••</dd>
            </div>
          </dl>
          <p className="summary-note">
            You're signed in with a secure HttpOnly session cookie.
          </p>
          <Link to="/change-password" className="btn btn-outline atelier-cta">
            Change password <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section aria-label="Shortcuts">
          <div className="atelier-tiles">
            <Link to="/orders" className="atelier-tile">
              <strong>Orders</strong>
              <span>Track every purchase →</span>
            </Link>
            <Link to="/wishlist" className="atelier-tile">
              <strong>Wishlist</strong>
              <span>Everything you saved →</span>
            </Link>
            <Link to="/products" className="atelier-tile">
              <strong>Shelves</strong>
              <span>Keep browsing →</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Profile
