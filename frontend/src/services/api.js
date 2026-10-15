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

export default api
