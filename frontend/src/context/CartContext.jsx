import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { addToCart as apiAdd, getCart as apiGet, removeFromCart as apiRemove, updateCartQuantity as apiUpdate } from '../services/cart'
import { warnApi } from '../services/api'

const CartContext = createContext(null)

// Global cart state — the ONE shared source of frontend truth for the cart.
// Backend (MongoDB) is the persistent source of truth; this context mirrors it
// so Navbar, ProductCard and Cart Page always agree without separate fetches.
// Derived values (count, subtotal) are computed here, never stored in MongoDB.
export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingIds, setPendingIds] = useState(new Set())
  const [itemErrors, setItemErrors] = useState({})

  const applyCart = useCallback((cart) => {
    // Defensive: drop rows whose product was deleted (backend prunes too,
    // but never render a broken row).
    setItems((Array.isArray(cart) ? cart : []).filter((it) => it && it.product))
  }, [])

  const markPending = useCallback((productId, on) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(productId)
      else next.delete(productId)
      return next
    })
  }, [])

  const setItemError = useCallback((productId, message) => {
    setItemErrors((prev) => {
      if (!message) {
        if (!(productId in prev)) return prev
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: message }
    })
  }, [])

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiGet()
      applyCart(data.cart)
    } catch (err) {
      warnApi('cart:refresh', err)
      // Keep the last known items (if any) but flag the error: Cart.jsx
      // shows a "may be out of date" banner when items exist, and a full
      // error panel when the cart is empty. Never silently show stale data.
      setError("Unable to load your cart.")
    } finally {
      setLoading(false)
    }
  }, [user, applyCart])

  // Load on login, clear on logout. Refresh survives via backend persistence.
  useEffect(() => {
    refresh()
  }, [refresh])

  // Each mutation resolves null on success or an error message on failure,
  // so callers can react honestly (e.g. only toast "Added" when it worked).
  // A skipped duplicate (already pending) resolves undefined — not success.
  const addItem = useCallback(async (productId) => {
    if (pendingIds.has(productId)) return undefined
    markPending(productId, true)
    setItemError(productId, '')
    try {
      const data = await apiAdd(productId)
      applyCart(data.cart)
      return null
    } catch (err) {
      warnApi('cart:add', err)
      const message = err.response?.data?.message || 'Unable to add to cart. Please try again.'
      setItemError(productId, message)
      return message
    } finally {
      markPending(productId, false)
    }
  }, [pendingIds, markPending, setItemError, applyCart])

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (pendingIds.has(productId)) return undefined
    markPending(productId, true)
    setItemError(productId, '')
    try {
      const data = await apiUpdate(productId, quantity)
      applyCart(data.cart)
      return null
    } catch (err) {
      warnApi('cart:update', err)
      const message = err.response?.data?.message || 'Unable to update quantity. Please try again.'
      setItemError(productId, message)
      return message
    } finally {
      markPending(productId, false)
    }
  }, [pendingIds, markPending, setItemError, applyCart])

  const removeItem = useCallback(async (productId) => {
    if (pendingIds.has(productId)) return undefined
    markPending(productId, true)
    setItemError(productId, '')
    try {
      const data = await apiRemove(productId)
      applyCart(data.cart)
      return null
    } catch (err) {
      warnApi('cart:remove', err)
      const message = err.response?.data?.message || "We couldn't remove that product. Please try again."
      setItemError(productId, message)
      return message
    } finally {
      markPending(productId, false)
    }
  }, [pendingIds, markPending, setItemError, applyCart])

  // Derived state — computed from items + latest populated prices.
  const { count, subtotal } = useMemo(() => {
    let c = 0, s = 0
    for (const it of items) {
      const qty = it.quantity || 0
      c += qty
      s += (it.product?.price || 0) * qty
    }
    return { count: c, subtotal: s }
  }, [items])

  const value = useMemo(() => ({
    items, loading, error, refresh,
    addItem, updateQuantity, removeItem,
    pendingIds, itemErrors, count, subtotal,
  }), [items, loading, error, refresh, addItem, updateQuantity, removeItem, pendingIds, itemErrors, count, subtotal])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
