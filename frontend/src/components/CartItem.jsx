import { Link } from 'react-router-dom'
import { QuantitySelector, SafeImage, inr } from './ui'

function CartItem({ item, pending = false, itemError = '', onIncrease, onDecrease, onRemove }) {
  const product = item?.product
  // Defensive: populated reference can be null if its product was deleted.
  if (!product) return null

  const qty = item.quantity || 1
  const atMax = qty >= (product.stock || 0)
  const lineTotal = (product.price || 0) * qty

  return (
    <article className="cart-item">
      <Link to={`/products/${product._id}`} className="cart-thumb" aria-label={`View ${product.name}`}>
        <SafeImage src={product.image} alt={product.name} />
      </Link>
      <div className="cart-info">
        <p className="product-category">{product.category}</p>
        <h3 className="cart-name">
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <p className="product-price">{inr(product.price)}</p>
        <p className={product.stock === 0 ? 'product-stock empty' : 'product-stock'}>
          <span className="stock-dot" aria-hidden="true" />
          {product.stock === 0 ? 'Currently unavailable' : `${product.stock} units available`}
        </p>
        <div className="qty-row">
          <QuantitySelector
            value={qty}
            max={product.stock || 0}
            pending={pending}
            label={`Quantity for ${product.name}`}
            onChange={(next) => {
              if (next < 1) return
              if (next > qty) onIncrease(product._id, next)
              else onDecrease(product._id, next)
            }}
          />
          <p className="line-total">{inr(lineTotal)}</p>
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
