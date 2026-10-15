import { Link } from 'react-router-dom'
import { SafeImage, inr } from './ui'

// Signature card: square image-first composition, serif title, tabular price,
// honest stock line. Navigation via image + title; heart + Add to Cart are
// always visible (no hover-gated functionality on touch).
function ProductCard({ product, index = 0, saved = false, saving = false, wishError = '', onToggleWishlist = null, onAddToCart = null, adding = false, cartError = '' }) {
  const outOfStock = product.stock === 0
  const low = !outOfStock && product.stock <= 5

  return (
    <article
      className={outOfStock ? 'product-card is-out' : 'product-card'}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      aria-label={product.name}
    >
      <Link to={`/products/${product._id}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <SafeImage src={product.image} alt={product.name} />
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
          <p className="product-price">{inr(product.price)}</p>
          <p className={outOfStock ? 'product-stock empty' : low ? 'product-stock low' : 'product-stock'}>
            <span className="stock-dot" aria-hidden="true" />
            {outOfStock ? 'Out of stock' : low ? `Only ${product.stock} left` : `${product.stock} in stock`}
          </p>
        </div>
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
      </div>
    </article>
  )
}

export default ProductCard
