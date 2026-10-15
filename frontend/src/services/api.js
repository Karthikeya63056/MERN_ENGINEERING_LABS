// Central axios instance — same pattern as class (axiosCalls/axios.js).
// withCredentials lets the browser send the HttpOnly JWT cookie automatically.
import axios from 'axios'

// Central axios instance — same pattern as class (axiosCalls/axios.js).
// withCredentials lets the browser send the HttpOnly JWT cookie automatically.
// Production URL comes from Vercel env; localhost stays the zero-config default.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Stale sessions: if the cookie died mid-visit (expiry, server-side clear),
// every protected call starts 401ing while the UI still claims "logged in".
// Broadcast once per burst; AuthContext clears the user so ProtectedRoute
// bounces to login instead of showing a dead, logged-in-looking app.
let expiredNotified = false
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && !expiredNotified) {
      expiredNotified = true
      window.dispatchEvent(new Event('auth:expired'))
      setTimeout(() => { expiredNotified = false }, 5000)
    }
    return Promise.reject(err)
  },
)

// Sanitized error logging. Raw axios errors carry config.data — passwords,
// addresses, payment payloads — so never dump the whole object to the
// console. Log scope + status + server message only.
export const warnApi = (scope, err) => {
  console.log(
    `[${scope}]`,
    err?.response?.status ?? 'network',
    err?.response?.data?.message || err?.message || 'request failed',
  )
}

export default api
