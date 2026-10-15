// Visual order-status: pill for compact spots, stepper for details page.
// Stages: PLACED → CONFIRMED → SHIPPED → DELIVERED (PENDING_PAYMENT shown
// separately while payment is unresolved).
export const STAGES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

export const NEXT_STAGE = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

// Normalize backend casing without losing unknown values.
export const normStatus = (s) => String(s || '').toUpperCase()

const STATUS_TONE = {
  PENDING_PAYMENT: 'pending',
  PLACED: 'processing',
  CONFIRMED: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
}

export function StatusPill({ status }) {
  const key = normStatus(status)
  const tone = STATUS_TONE[key] || ''
  const label = key
    ? key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')
    : 'Unknown'
  return (
    <span className={tone ? `status-pill ${tone}` : 'status-pill'}>
      <span className="stock-dot" aria-hidden="true" />
      {label}
    </span>
  )
}

// Payment state is separate from fulfilment: a failed payment is not a
// cancelled order, and a paid order is not necessarily delivered.
export function PaymentPill({ paymentStatus }) {
  const key = normStatus(paymentStatus)
  if (key === 'PAID') {
    return (
      <span className="status-pill paid">
        <span className="stock-dot" aria-hidden="true" />
        Paid
      </span>
    )
  }
  if (key === 'FAILED') {
    return (
      <span className="status-pill failed">
        <span className="stock-dot" aria-hidden="true" />
        Payment failed
      </span>
    )
  }
  return (
    <span className="status-pill pending">
      <span className="stock-dot" aria-hidden="true" />
      Payment pending
    </span>
  )
}

export function StatusTracker({ status }) {
  const activeIndex = STAGES.indexOf(status)
  return (
    <ol className="tracker" aria-label={`Order status: ${status}`}>
      {STAGES.map((stage, i) => (
        <li key={stage} className={i <= activeIndex ? 'track-step done' : 'track-step'}>
          <span className="track-dot" aria-hidden="true" />
          <span className="track-label">{stage.charAt(0) + stage.slice(1).toLowerCase()}</span>
        </li>
      ))}
    </ol>
  )
}
