import { Link } from 'react-router-dom'

function WishlistCard({ product, index = 0, removing = false, onRemove }) {
  // Defensive: a populated reference can be null if its product was
  // deleted (the backend filters these, but never render a broken card).
  if (!product) return null

  const outOfStock = product.stock === 0

  return (
    <article
      className={outOfStock ? 'product-card is-out' : 'product-card'}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <Link to={`/products/${product._id}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
        {outOfStock && <span className="stock-flag">Out of stock</span>}
      </Link>
      <div className="product-body">
        <p className="product-category">{product.category}</p>
        <h3 className="product-name">
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <div className="product-meta">
          <p className="product-price">₹{product.price.toLocaleString('en-IN')}</p>
          <p className={outOfStock ? 'product-stock empty' : 'product-stock'}>
            <span className="stock-dot" aria-hidden="true" />
            {outOfStock ? 'Out of stock' : `${product.stock} left`}
          </p>
        </div>
        <Link to={`/products/${product._id}`} className="card-link">
          View Details <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          className="btn btn-remove"
          disabled={removing}
          onClick={() => onRemove(product._id)}
        >
          {removing ? 'Removing...' : '♥ Remove from Wishlist'}
        </button>
      </div>
    </article>
  )
}

export default WishlistCard
