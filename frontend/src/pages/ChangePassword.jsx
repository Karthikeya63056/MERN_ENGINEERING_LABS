import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { warnApi } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Breadcrumbs } from '../components/ui'

// Self-service password change. Uses the existing authenticated endpoint
// PATCH /customers/change-password { oldPassword, newPassword }.
// The backend keeps the session valid, so no re-login is needed.
function ChangePassword() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState({ old: false, fresh: false })
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [loader, setLoader] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const toggle = (which) => setShowPw((prev) => ({ ...prev, [which]: !prev[which] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setDone('')

    if (!form.oldPassword || !form.newPassword || !form.confirm) {
      setErr('All fields are required')
      return
    }
    if (form.newPassword.length < 6) {
      setErr('New password must be at least 6 characters')
      return
    }
    if (form.newPassword !== form.confirm) {
      setErr('New passwords do not match')
      return
    }

    setLoader(true)
    try {
      const res = await api.patch('/customers/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      })
      setDone(res.data?.message || 'Password changed successfully')
      setForm({ oldPassword: '', newPassword: '', confirm: '' })
    } catch (error) {
      warnApi('change-password', error)
      setErr(error.response?.data?.message || 'Could not change your password. Please try again.')
    } finally {
      setLoader(false)
    }
  }

  const pwField = (id, name, label, visible, autocomplete, placeholder) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autocomplete}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          style={{ paddingRight: 76 }}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => toggle(name === 'oldPassword' ? 'old' : 'fresh')}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <Breadcrumbs trail={[{ label: 'Home', to: '/home' }, { label: 'Change password' }]} />
        <div className="narrow-wrap">
          <div className="card narrow-card">
            <p className="eyebrow">Account security</p>
            <h1 className="form-title" style={{ fontSize: 26 }}>Change password</h1>
            <p className="tagline" style={{ textAlign: 'left', margin: '0 0 18px' }}>
              You stay signed in on this device afterwards.
            </p>

            {err && <p className="error" role="alert">{err}</p>}
            {done && <p className="notice" role="status">{done}</p>}

            <form className="form" onSubmit={handleSubmit}>
              {pwField('oldPassword', 'oldPassword', 'Current password', showPw.old, 'current-password', 'Your current password')}
              {pwField('newPassword', 'newPassword', 'New password', showPw.fresh, 'new-password', 'Min. 6 characters')}
              <div>
                <label htmlFor="confirm">Confirm new password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type={showPw.fresh ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat the new password"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loader}>
                {loader ? 'Updating...' : 'Update password'}
              </button>
            </form>

            <p className="switch">
              <Link to="/home">← Back to home</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ChangePassword
