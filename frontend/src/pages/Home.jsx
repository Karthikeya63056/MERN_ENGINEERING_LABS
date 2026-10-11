import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Navbar from '../components/Navbar'

function Home() {
  const { user, setUser } = useAuth()
  const [customer, setCustomer] = useState(user || null)
  const [loading, setLoading] = useState(!user)
  const navigate = useNavigate()

  // Always fetch the source of truth from the backend (not localStorage).
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await api.get('/customers/me')
        setCustomer(response.data)
        setUser(response.data)
      } catch {
        navigate('/login', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    if (!user) {
      fetchMe()
    }
  }, [user, setUser, navigate])

  if (loading) {
    return <p className="loading">Loading...</p>
  }

  if (!customer) {
    return null
  }

  return (
    <div>
      <Navbar />
      <div className="page">
        <div className="card">
          <div className="ledger-head">
            <p className="eyebrow">Member account</p>
            <h1 className="ledger-name">Hello, {customer.fullName?.split(' ')[0]}.</h1>
            <p className="ledger-sub">Good to see you back at the store.</p>
          </div>
          <div className="ledger">
            <div className="ledger-row"><span>Name</span><p>{customer.fullName}</p></div>
            <div className="ledger-row"><span>Email</span><p>{customer.email}</p></div>
            <div className="ledger-row"><span>Phone</span><p>{customer.phone}</p></div>
          </div>
          <p className="ledger-foot">“The festive collection arrives Friday.”</p>
        </div>
      </div>
    </div>
  )
}

export default Home
