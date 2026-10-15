import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
let seq = 0

// Lightweight toast bus: cart / wishlist / order actions announce
// outcomes without blocking. Auto-dismisses; screen-reader live region.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback((message, kind = 'success') => {
    const id = ++seq
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }])
    timers.current.set(id, setTimeout(() => dismiss(id), 3500))
  }, [dismiss])

  const notify = useCallback((message) => push(message, 'success'), [push])
  const notifyError = useCallback((message) => push(message, 'error'), [push])

  return (
    <ToastContext.Provider value={{ notify, notifyError }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={t.kind === 'error' ? 'toast error' : 'toast success'}>
            <span>{t.kind === 'error' ? '⚠️' : '✓'}&nbsp;</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  // Toasts are progressive enhancement — pages work without the provider.
  if (!ctx) return { notify: () => {}, notifyError: () => {} }
  return ctx
}
