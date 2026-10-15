import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On app load, ask the backend who we are (cookie is sent automatically).
  // If 401 → not logged in, otherwise we get the customer object.
  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await api.get('/customers/me')
        setUser(response.data)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    hydrate()
  }, [])

  const logout = async () => {
    try {
      await api.post('/customers/logout')
    } finally {
      setUser(null)
    }
  }

  // A 401 anywhere means the session is dead (expired cookie, cleared
  // server-side). Drop the user so the app stops pretending we're logged in.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
