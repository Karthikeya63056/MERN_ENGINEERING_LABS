import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOrders } from '../services/orders'
import { warnApi } from '../services/api'
import { normStatus } from '../components/OrderStatus'
import OrderCard from '../components/OrderCard'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Breadcrumbs, EmptyState, ErrorState } from '../components/ui'

const FILTERS = [
  { id: 'all', label: 'All orders', test: () => true },
  { id: 'awaiting', label: 'Awaiting payment', test: (o) => normStatus(o.status) === 'PENDING_PAYMENT' },
  { id: 'progress', label: 'In progress', test: (o) => ['PLACED', 'CONFIRMED', 'SHIPPED'].includes(normStatus(o.status)) },
  { id: 'delivered', label: 'Delivered', test: (o) => normStatus(o.status) === 'DELIVERED' },
  { id: 'failed', label: 'Payment failed', test: (o) => normStatus(o.paymentStatus) === 'FAILED' },
]

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'highest', label: 'Highest total' },
  { id: 'lowest', label: 'Lowest total' },
]

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await getOrders()
      setOrders(Array.isArray(data.orders) ? data.orders : [])
    } catch (error) {
      warnApi('orders', error)
      setErr("We couldn't load your orders.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Derived from the fetched array — the original is never mutated.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const f = FILTERS.find((x) => x.id === filter) || FILTERS[0]
    const rows = orders.filter((o) => {
      if (!f.test(o)) return false
      if (!q) return true
      if (String(o._id || '').toLowerCase().includes(q)) return true
      return (Array.isArray(o.items) ? o.items : []).some((it) =>
        String(it.name || '').toLowerCase().includes(q),
      )
    })
    const by = {
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      oldest: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      highest: (a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0),
      lowest: (a, b) => (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0),
    }[sort] || null
    return by ? [...rows].sort(by) : rows
  }, [orders, query, filter, sort])

  // Honest summary: counts straight from the fetched orders, nothing more.
  const summary = useMemo(() => {
    let delivered = 0
    let inProgress = 0
    let failed = 0
    let latest = 0
    for (const o of orders) {
      const s = normStatus(o.status)
      if (s === 'DELIVERED') delivered += 1
      else if (normStatus(o.paymentStatus) === 'FAILED') failed += 1
      else inProgress += 1
      const t = new Date(o.createdAt || 0).getTime()
      if (!Number.isNaN(t) && t > latest) latest = t
    }
    return { total: orders.length, delivered, inProgress, failed, latest }
  }, [orders])

  const hasControls = query.trim() !== '' || filter !== 'all'
  const clearAll = () => {
    setQuery('')
    setFilter('all')
  }

  return (
    <div>
      <Navbar />
      <main className="shop journal" id="main">
        <Breadcrumbs trail={[{ label: 'Home', to: '/home' }, { label: 'Orders' }]} />

        <header className="journal-head">
          <div>
            <p className="eyebrow left journal-eyebrow">Your shopping journal</p>
            <h1 className="journal-title">Every order, <em>kept.</em></h1>
            <p className="shop-sub">
              {loading
                ? 'Opening your journal…'
                : summary.total === 0
                  ? 'Your confirmed orders will live here.'
                  : `${summary.total} order${summary.total === 1 ? '' : 's'} · ${summary.delivered} delivered${summary.inProgress > 0 ? ` · ${summary.inProgress} in progress` : ''}`}
            </p>
          </div>
          {!loading && !err && summary.total > 0 && (
            <dl className="journal-strip" aria-label="Order summary">
              <div><dt>Orders</dt><dd>{summary.total}</dd></div>
              <div><dt>In progress</dt><dd>{summary.inProgress}</dd></div>
              <div><dt>Delivered</dt><dd>{summary.delivered}</dd></div>
            </dl>
          )}
        </header>

        {loading && (
          <>
            <p className="loading">Loading your orders...</p>
            <div className="order-list" aria-hidden="true">
              {[0, 1, 2].map((n) => (
                <div key={n} className="order-card skel-order">
                  <div className="skel skel-oline" />
                  <div className="skel skel-oline short" />
                  <div className="skel skel-othumbs" />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && err && <ErrorState sub={err} onRetry={fetchOrders} />}

        {!loading && !err && orders.length === 0 && (
          <EmptyState
            title="No orders yet — your journal awaits its first entry."
            sub="Anything you buy will be recorded here with its status and total."
            actionTo="/products"
            actionLabel="Explore products"
          />
        )}

        {!loading && !err && orders.length > 0 && (
          <>
            <div className="journal-toolbar" role="search" aria-label="Find orders">
              <div className="journal-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search order ID or product…"
                  aria-label="Search by order ID or product name"
                />
                {query && (
                  <button type="button" className="journal-clear" onClick={() => setQuery('')} aria-label="Clear search">
                    ×
                  </button>
                )}
              </div>
              <label className="journal-sort">
                <span className="sr-only">Sort orders</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort orders">
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="journal-filters" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => {
                const n = orders.filter(f.test).length
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={active ? 'jfilter active' : 'jfilter'}
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                    <span className="jfilter-count">{n}</span>
                  </button>
                )
              })}
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                <p className="empty-title">Nothing matches those filters.</p>
                <p className="empty-sub">
                  {hasControls
                    ? 'Try a different search term or status — your orders are still here.'
                    : 'Your orders are still here.'}
                </p>
                {hasControls && (
                  <button type="button" className="btn btn-outline" onClick={clearAll}>
                    Clear search &amp; filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="journal-count" aria-live="polite">
                  Showing <strong>{visible.length}</strong> of <strong>{orders.length}</strong>
                </p>
                <div className="order-list">
                  {visible.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Orders
