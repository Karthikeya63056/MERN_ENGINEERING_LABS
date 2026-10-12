// Cart service — thin API wrappers. State lives in CartContext (single source
// of truth); components never fetch the cart directly.
import api from './api'

export const getCart = () => api.get('/cart').then((res) => res.data)

export const addToCart = (productId) =>
  api.post(`/cart/${productId}`).then((res) => res.data)

export const updateCartQuantity = (productId, quantity) =>
  api.patch(`/cart/${productId}`, { quantity }).then((res) => res.data)

export const removeFromCart = (productId) =>
  api.delete(`/cart/${productId}`).then((res) => res.data)
