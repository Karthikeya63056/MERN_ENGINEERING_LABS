import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// Invalid routes land here for signed-in users (guests are still sent to
// /login by ProtectedRoute). Only real in-app destinations are linked.
function NotFound() {
  return (
    <div>
      <Navbar />
      <main className="shop" id="main">
        <div className="empty">
          <p className="empty-title">That shelf doesn&apos;t exist.</p>
          <p className="empty-sub">The page you asked for isn&apos;t part of the store.</p>
          <Link to="/home" className="btn btn-primary inline-btn">Back to Home</Link>
          <div>
            <Link to="/products" className="switch-link">Browse products instead →</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound
