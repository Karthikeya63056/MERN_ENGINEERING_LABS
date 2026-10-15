import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Shared presentation primitives. No data fetching here — pages own
// their API calls and pass real data down.
export const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`

export function Breadcrumbs({ trail = [] }) {
  if (!trail.length) return null
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {trail.map((t, i) => (
        <span key={t.label} style={{ display: 'contents' }}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {t.to ? <Link to={t.to}>{t.label}</Link> : <span>{t.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function EmptyState({ title, sub, actionTo, actionLabel }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {actionTo && <Link to={actionTo} className="btn btn-primary inline-btn">{actionLabel}</Link>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong.', sub, onRetry }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {onRetry && (
        <button type="button" className="btn btn-primary inline-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, n) => (
        <div key={n} className="skel-card">
          <div className="skel skel-img" />
          <div className="skel skel-line" />
          <div className="skel skel-line short" />
        </div>
      ))}
    </div>
  )
}

// Accessible stepper. Parent owns the async update; we only emit intent.
export function QuantitySelector({ value, max, pending = false, label = 'Quantity', onChange }) {
  const atMin = value <= 1
  const atMax = max != null && value >= max
  return (
    <div className="qty-controls" role="group" aria-label={label}>
      <button
        type="button"
        className="qty-btn"
        disabled={pending || atMin}
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="qty-value" aria-live="polite">{pending ? '···' : value}</span>
      <button
        type="button"
        className="qty-btn"
        disabled={pending || atMax}
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        title={atMax && max > 0 ? `Only ${max} units available` : 'Increase quantity'}
      >
        +
      </button>
    </div>
  )
}

// Product images come from seller URLs — some are dead (e.g. test products
// pointing at example.com). A missing/failed image renders an honest,
// clearly-designed placeholder tile — never a broken-image icon and never
// fake photography.
export function SafeImage({ src, alt, className, loading = 'lazy', ...rest }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  if (!src || failed) {
    const initial = (String(alt || 'S').trim().charAt(0) || 'S').toUpperCase()
    return (
      <span className={`img-fallback${className ? ` ${className}` : ''}`} role="img" aria-label={alt}>
        <span aria-hidden="true">{initial}</span>
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
