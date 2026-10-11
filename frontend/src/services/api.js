// Central axios instance — same pattern as class (axiosCalls/axios.js).
// withCredentials lets the browser send the HttpOnly JWT cookie automatically.
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
