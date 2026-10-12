import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [err, setErr] = useState('')
  const [loader, setLoader] = useState(false)
  const navigate = useNavigate()

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
      // Lab 02 flow: registration creates the account, then the customer
      // logs in on the Login page (which establishes the UI session).
      await api.post('/customers/register', form)
      navigate('/login', { replace: true })
    } catch (error) {
      console.log(error)
      setErr(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoader(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <p className="eyebrow">Your neighbourhood store</p>
        <h1 className="wordmark">Shop<em>Kart</em></h1>
        <p className="tagline">One account for everything in the store.</p>
        <hr className="rule" />
        <h2 className="form-title">Create account</h2>

        {err && <p className="error">{err}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

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
              placeholder="Min. 6 characters"
            />
          </div>

          <div>
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="9876543210"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loader}>
            {loader ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="switch">
          Already a member? <Link to="/login">Log in</Link>
        </p>

        <p className="assurance">
          Takes 30 seconds · <strong>No spam, ever</strong>
        </p>
      </div>
    </div>
  )
}

export default Register
