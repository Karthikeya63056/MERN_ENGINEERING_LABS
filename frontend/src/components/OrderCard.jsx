import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentPill, StatusPill } from './OrderStatus'
import { SafeImage, inr } from './ui'

export const fmtDate = (iso) => {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

const shortId = (id) => {
  const s = String(id || '')
  return s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s
}

// One purchase at a glance: identity → items → total → action.
// Only real fields: id, date, statuses, item snapshots, totalAmount.
function OrderCard({ order }) {
  const [copied, setCopied] = useState(false)
  if (!order) return null

  const items = Array.isArray(order.items) ? order.items : []
  const preview = items.slice(0, 4)
  const extra = items.length - preview.length
  const unitCount = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0)

  const copyId = async () => {
    const full = String(order._id || '')
    if (!full || copied) return
    try {
      await navigator.clipboard.writeText(full)
    } catch {
      // Clipboard API unavailable (permissions, insecure context): fall back
      // to a selectable legacy copy so the action still works.
      try {
        const ta = document.createElement('textarea')
        ta.value = full
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        return
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article className="order-card" aria-label={`Order ${order._id}`}>
      <header className="order-head">
        <div className="order-idwrap">
          <p className="order-eyebrow">Order</p>
          <p className="order-id" title={order._id}>
            <span className="order-idtext">{shortId(order._id)}</span>
            <button
              type="button"
              className="order-copy"
              onClick={copyId}
              aria-label={copied ? 'Order ID copied' : `Copy order ID ${order._id}`}
              title="Copy full order ID"
            >
              {copied ? '✓ Copied' : '⧉ Copy'}
            </button>
          </p>
          {fmtDate(order.createdAt) && (
            <p className="order-date">{fmtDate(order.createdAt)}</p>
          )}
        </div>
        <div className="order-pills">
          <StatusPill status={order.status} />
          <PaymentPill paymentStatus={order.paymentStatus} />
        </div>
      </header>

      {preview.length > 0 && (
        <div className="order-thumbs" aria-label={`${items.length} item${items.length === 1 ? '' : 's'}`}>
          {preview.map((it) => (
            <span key={String(it.product || it.name)} className="order-thumb" title={`${it.name || 'Item'} × ${it.quantity || 1}`}>
              {it.image ? (
                <SafeImage src={it.image} alt="" loading="lazy" />
              ) : (
                <span className="img-fallback" aria-hidden="true">
                  <span>{String(it.name || 'S').trim().charAt(0).toUpperCase()}</span>
                </span>
              )}
            </span>
          ))}
          {extra > 0 && (
            <span className="order-thumb more" aria-hidden="true">+{extra}</span>
          )}
        </div>
      )}

      <p className="order-lines" aria-label="Items">
        {items.slice(0, 2).map((it) => (
          <span key={String(it.product || it.name)} className="order-line">
            <span className="order-linename">{it.name || 'Item'}</span>
            <span className="order-lineqty">× {it.quantity || 1}</span>
          </span>
        ))}
        {items.length > 2 && (
          <span className="order-line muted">+{items.length - 2} more item{items.length - 2 === 1 ? '' : 's'} · {unitCount} unit{unitCount === 1 ? '' : 's'} total</span>
        )}
        {items.length <= 2 && items.length > 0 && (
          <span className="order-line muted">{unitCount} unit{unitCount === 1 ? '' : 's'} total</span>
        )}
      </p>

      <footer className="order-foot">
        <p className="order-total">
          <span>Total</span>
          <strong>{inr(order.totalAmount)}</strong>
        </p>
        <Link to={`/orders/${order._id}`} className="btn btn-outline order-cta">
          View details →
        </Link>
      </footer>
    </article>
  )
}

export default OrderCard
