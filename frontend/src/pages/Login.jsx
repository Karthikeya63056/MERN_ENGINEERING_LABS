import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loader, setLoader] = useState(false)

  const navigate = useNavigate()
  const { setUser } = useAuth()

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
    <div className="page">
      <div className="card">
        <p className="eyebrow">Your neighbourhood store</p>
        <h1 className="wordmark">Shop<em>Kart</em></h1>
        <p className="tagline">Welcome back — we kept your shelf warm.</p>
        <hr className="rule" />
        <h2 className="form-title">Log in</h2>

        {err && <p className="error">{err}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="john@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loader}>
            {loader ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="switch">
          New here? <Link to="/register">Create an account</Link>
        </p>

        <p className="assurance">
          <strong>4.8</strong> from 12,000+ shoppers · Easy 7-day returns
        </p>
      </div>
    </div>
  )
}

export default Login
