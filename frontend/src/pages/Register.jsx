import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { warnApi } from '../services/api'
import { SafeImage, inr } from '../components/ui'

// Account creation only: POST /customers/register with
// { fullName, email, password, phone }, then the customer signs in on
// /login. No other fields, no extra steps, no invented requirements.
function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loader, setLoader] = useState(false)
  // Discovery tiles: real products on the shelves today (public endpoint).
  // Failure is silent — the page is complete without them.
  const [tiles, setTiles] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    api.get('/products')
      .then((res) => {
        if (!live) return
        const items = (res.data.products || []).filter((p) => p.stock > 0 && p.image)
        setTiles([items[5], items[14], items[21]].filter(Boolean).slice(0, 3))
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

    if (!form.fullName || !form.email || !form.password || !form.phone) {
      setErr('All fields are required')
      return
    }
    if (form.password.length < 6) {
      setErr('Password must be at least 6 characters')
      return
    }

    setLoader(true)
    try {
      // Registration creates the account; the Login page establishes
      // the session afterwards.
      await api.post('/customers/register', form)
      navigate('/login', { replace: true })
    } catch (error) {
      warnApi('register', error)
      setErr(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoader(false)
    }
  }

  const pwOk = form.password.length >= 6

  return (
    <div className="reg-page">
      <header className="auth-top">
        <span className="brand" aria-label="ShopKart">
          <span className="brand-mark" aria-hidden="true" />
          ShopKart
        </span>
        <Link to="/login" className="reg-signin">
          Already a member? <strong>Log in</strong>
        </Link>
      </header>

      <main className="reg-shell" id="main">
        <section className="reg-panel" aria-label="Create your account">
          <h1 className="reg-form-title">Create your account</h1>
          <p className="reg-form-sub">Thirty seconds now — yours every visit after.</p>

          {err && <p className="error" role="alert" id="register-error">{err}</p>}

          <form className="reg-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="fullName">Full Name</label>
              <div className="auth-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'register-error' : undefined}
                />
              </div>
            </div>

            <div className="reg-row">
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
                    value={form.email}
                    onChange={handleChange}
                    placeholder="john@gmail.com"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? 'register-error' : undefined}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="phone">Phone Number</label>
                <div className="auth-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? 'register-error' : undefined}
                  />
                </div>
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
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="with-toggle"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'register-error' : 'pw-hint'}
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
              <p id="pw-hint" className={pwOk ? 'pw-hint met' : 'pw-hint'}>
                {pwOk ? '✓ 6+ characters — looking good.' : 'At least 6 characters.'}
              </p>
            </div>

            <button type="submit" className="btn btn-primary reg-submit" disabled={loader}>
              {loader ? 'Creating your account...' : 'Create account →'}
            </button>
          </form>

          <p className="auth-fine">Takes 30 seconds · <strong>No spam, ever</strong></p>
        </section>

        <section className="reg-discovery" aria-label="Start discovering">
          <p className="reg-kicker">The Discovery Atelier</p>
          <h2 className="reg-title">Find your next <em>favorite thing.</em></h2>
          <p className="reg-sub">
            Create your account and make every discovery yours — your cart,
            wishlist, and orders travel with you from the very first visit.
          </p>

          {tiles.length === 3 && (
            <div className="reg-tiles" aria-label="Waiting on the shelves">
              {tiles.map((p, i) => (
                <figure key={p._id} className={`reg-tile r${i}`}>
                  <SafeImage src={p.image} alt="" />
                  <figcaption>
                    <span>{p.name}</span>
                    <strong>{inr(p.price)}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <ol className="reg-steps">
            <li><strong>01</strong><span>Create your account — about 30 seconds.</span></li>
            <li><strong>02</strong><span>Sign in and say hello to your shelves.</span></li>
            <li><strong>03</strong><span>Cart, wishlist &amp; orders, everywhere you go.</span></li>
          </ol>
        </section>
      </main>

      <footer className="auth-foot">
        ShopKart · One account for everything in the store.
      </footer>
    </div>
  )
}

export default Register
