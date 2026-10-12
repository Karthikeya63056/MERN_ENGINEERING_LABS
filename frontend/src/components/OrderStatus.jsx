// Visual order-status: pill for compact spots, stepper for details page.
// Stages: PLACED → CONFIRMED → SHIPPED → DELIVERED (PENDING_PAYMENT shown
// separately while payment is unresolved).
export const STAGES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

export const NEXT_STAGE = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

export function StatusPill({ status }) {
  const pending = status === 'PENDING_PAYMENT'
  return (
    <span className={pending ? 'status-pill pending' : 'status-pill'}>
      <span className="stock-dot" aria-hidden="true" />
      {status?.replace('_', ' ')}
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
