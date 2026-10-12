import { Link } from 'react-router-dom'

function CartItem({ item, pending = false, itemError = '', onIncrease, onDecrease, onRemove }) {
  const product = item?.product
  // Defensive: populated reference can be null if its product was deleted.
  if (!product) return null

  const qty = item.quantity || 1
  const atMin = qty <= 1
  const atMax = qty >= (product.stock || 0)
  const lineTotal = (product.price || 0) * qty

  return (
    <article className="cart-item">
      <Link to={`/products/${product._id}`} className="cart-thumb" aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="cart-info">
        <p className="product-category">{product.category}</p>
        <h3 className="cart-name">
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <p className="product-price">₹{(product.price || 0).toLocaleString('en-IN')}</p>
        <p className={product.stock === 0 ? 'product-stock empty' : 'product-stock'}>
          <span className="stock-dot" aria-hidden="true" />
          {product.stock === 0 ? 'Currently unavailable' : `${product.stock} units available`}
        </p>
        <div className="qty-row">
          <div className="qty-controls" role="group" aria-label={`Quantity for ${product.name}`}>
            <button
              type="button"
              className="qty-btn"
              disabled={pending || atMin}
              onClick={() => onDecrease(product._id, qty - 1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty-value" aria-live="polite">{pending ? '···' : qty}</span>
            <button
              type="button"
              className="qty-btn"
              disabled={pending || atMax}
              onClick={() => onIncrease(product._id, qty + 1)}
              aria-label="Increase quantity"
              title={atMax ? `Only ${product.stock} units available` : 'Increase quantity'}
            >
              +
            </button>
          </div>
          <p className="line-total">₹{lineTotal.toLocaleString('en-IN')}</p>
        </div>
        {atMax && product.stock > 0 && (
          <p className="stock-note">Max available stock reached.</p>
        )}
        <button
          type="button"
          className="btn btn-remove cart-remove"
          disabled={pending}
          onClick={() => onRemove(product._id)}
        >
          {pending ? 'Working...' : 'Remove'}
        </button>
        {itemError && <p className="wish-error" role="alert">{itemError}</p>}
      </div>
    </article>
  )
}

export default CartItem
