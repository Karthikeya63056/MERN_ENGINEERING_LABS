import { Link } from 'react-router-dom'

function ProductCard({ product, index = 0, saved = false, saving = false, wishError = '', onToggleWishlist = null, onAddToCart = null, adding = false, cartError = '' }) {
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
      {onToggleWishlist && (
        <button
          type="button"
          className={saved ? 'wish-btn saved' : 'wish-btn'}
          disabled={saving}
          onClick={() => onToggleWishlist(product._id)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={saved}
          title={saved ? 'Added to Wishlist' : 'Add to Wishlist'}
        >
          {saving ? (
            <span className="wish-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}
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
        {onToggleWishlist && (
          <button
            type="button"
            className="wish-text-btn"
            disabled={saving}
            onClick={() => onToggleWishlist(product._id)}
          >
            {saving ? 'Saving...' : saved ? '♥ Added to Wishlist' : '♡ Add to Wishlist'}
          </button>
        )}
        {wishError && <p className="wish-error">Unable to save product. Please try again.</p>}
        {onAddToCart && (
          <button
            type="button"
            className="btn btn-primary card-cart-btn"
            disabled={adding || outOfStock}
            onClick={() => onAddToCart(product._id)}
          >
            {adding ? 'Adding...' : 'Add to Cart'}
          </button>
        )}
        {cartError && <p className="wish-error" role="alert">{cartError}</p>}
        <Link to={`/products/${product._id}`} className="card-link">
          View Details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
