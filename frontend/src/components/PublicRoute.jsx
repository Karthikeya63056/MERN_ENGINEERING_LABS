import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="loading">Loading...</p>
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default PublicRoute
