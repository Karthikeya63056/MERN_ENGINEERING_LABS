// Wishlist service — all API logic lives here, UI only calls these.
// After every successful mutation we emit a DOM event so independent
// components (e.g. the Navbar count) can refresh without shared state.
import api from './api'

const notifyChanged = () => {
  window.dispatchEvent(new Event('wishlist:changed'))
}

export const getWishlist = () => api.get('/wishlist').then((res) => res.data)

export const addToWishlist = (productId) =>
  api.post(`/wishlist/${productId}`).then((res) => {
    notifyChanged()
    return res.data
  })

export const removeFromWishlist = (productId) =>
  api.delete(`/wishlist/${productId}`).then((res) => {
    notifyChanged()
    return res.data
  })

export const toggleWishlist = (productId) =>
  api.patch(`/wishlist/${productId}/toggle`).then((res) => {
    notifyChanged()
    return res.data
  })
