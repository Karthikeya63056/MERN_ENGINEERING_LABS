import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { SafeImage, inr } from '../components/ui'

// Sign-in only. No signup logic, no password recovery, no social buttons —
// the backend supports POST /customers/login (+ register/me/logout), so the
// page offers exactly that, presented as the store entrance.
function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loader, setLoader] = useState(false)
  // Showcase: real products on the shelves today (public endpoint).
  // Failure is silent — the page is complete without it.
  const [showcase, setShowcase] = useState([])
  const [shelfCount, setShelfCount] = useState(null)
  const [aisleCount, setAisleCount] = useState(null)

  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    let live = true
    api.get('/products')
      .then((res) => {
        if (!live) return
        const items = (res.data.products || []).filter((p) => p.stock > 0 && p.image)
        setShelfCount(res.data.products?.length ?? null)
        setAisleCount(new Set((res.data.products || []).map((p) => p.category)).size)
        setShowcase([items[2], items[9], items[17]].filter(Boolean).slice(0, 3))
      })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')

    if (!form.email || !form.password) {
      setErr('Email and password are required')
      return
    }

    setLoader(true)
    try {
      // Cookie (HttpOnly JWT) is stored by the browser automatically.
      const response = await api.post('/customers/login', form)
      setUser(response.data.customer || null)
      navigate('/home', { replace: true })
    } catch (error) {
      console.log(error)
      if (error.response?.status === 401) {
        setErr('Invalid credentials')
      } else {
        setErr(error.response?.data?.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoader(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-top">
        <span className="brand" aria-label="ShopKart">
          <span className="brand-mark" aria-hidden="true" />
          ShopKart
        </span>
        <span className="auth-secure">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Secure sign-in
        </span>
      </header>

      <main className="auth-shell" id="main">
        <section className="auth-hero" aria-label="Welcome back">
          <span className="auth-water" aria-hidden="true">Kart</span>
          <p className="auth-kicker">Your neighbourhood store, online</p>
          <h1 className="auth-title">Good to have <em>you back.</em></h1>
          <p className="auth-sub">
            Your next great find is just around the corner — sign in to pick up
            your cart, wishlist, and orders right where you left them.
          </p>

          {showcase.length === 3 && (
            <div className="auth-collage" aria-label="On the shelves today">
              {showcase.map((p, i) => (
                <figure key={p._id} className={`auth-tile t${i}`}>
                  <SafeImage src={p.image} alt="" />
                  <figcaption>
                    <span>{p.name}</span>
                    <strong>{inr(p.price)}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="auth-proof">
            {shelfCount != null && (
              <div className="auth-stat">
                <strong>{shelfCount}</strong>
                <span>finds{aisleCount ? ` · ${aisleCount} aisles` : ''}</span>
              </div>
            )}
            <div className="auth-stat">
              <strong>🔒</strong>
              <span>HttpOnly cookie session</span>
            </div>
            <div className="auth-stat">
              <strong>✓</strong>
              <span>Server-verified prices</span>
            </div>
          </div>
        </section>

        <section className="auth-panel" aria-label="Sign in">
          <h2 className="auth-form-title">Sign in</h2>
          <p className="auth-form-sub">Welcome back — your shelves are waiting.</p>

          {err && (
            <p className="error" role="alert" id="login-error">{err}</p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className="auth-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={form.email}
                  onChange={handleChange}
                  placeholder="john@gmail.com"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'login-error' : undefined}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Your password"
                  className="with-toggle"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'login-error' : undefined}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loader}>
              {loader ? 'Signing you in...' : 'Sign in →'}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true"><span>New to ShopKart?</span></div>
          <Link to="/register" className="btn btn-outline auth-create">
            Create an account
          </Link>
          <p className="auth-fine">One account for your cart, wishlist, and orders.</p>
        </section>
      </main>

      <footer className="auth-foot">
        ShopKart · Live prices and stock, confirmed on the server.
      </footer>
    </div>
  )
}

export default Login
