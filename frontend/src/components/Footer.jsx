import { Link } from 'react-router-dom'

// Structured footer: real in-app routes only, no invented links.
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand"><span className="brand-mark" aria-hidden="true" />ShopKart</p>
          <p className="footer-tag">Your neighbourhood store, online. Browse the shelves, save favourites, and check out securely.</p>
        </div>
        <nav aria-label="Shop">
          <p className="footer-head">Shop</p>
          <Link to="/products" className="footer-link">All products</Link>
          <Link to="/products?category=Electronics" className="footer-link">Electronics</Link>
          <Link to="/products?category=Fashion" className="footer-link">Fashion</Link>
          <Link to="/products?category=Books" className="footer-link">Books</Link>
          <Link to="/products?category=Home" className="footer-link">Home</Link>
        </nav>
        <nav aria-label="Account">
          <p className="footer-head">Account</p>
          <Link to="/cart" className="footer-link">My cart</Link>
          <Link to="/wishlist" className="footer-link">My wishlist</Link>
          <Link to="/orders" className="footer-link">My orders</Link>
          <Link to="/checkout" className="footer-link">Checkout</Link>
        </nav>
        <nav aria-label="Help">
          <p className="footer-head">Help</p>
          <Link to="/orders" className="footer-link">Track an order</Link>
          <Link to="/cart" className="footer-link">Delivery &amp; returns at checkout</Link>
          <Link to="/login" className="footer-link">Sign in</Link>
          <Link to="/register" className="footer-link">Create an account</Link>
        </nav>
      </div>
      <p className="footer-base">ShopKart · Prices and stock are confirmed on the server at checkout.</p>
    </footer>
  )
}

export default Footer
