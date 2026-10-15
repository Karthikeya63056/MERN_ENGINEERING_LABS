import { Children, useCallback, useEffect, useRef, useState } from 'react'

// Horizontally browsable product collection. Children are ProductCards;
// arrows scroll by ~one viewport of cards. Native swipe on touch.
function Rail({ children, label }) {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    update()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, Children.count(children)])

  const nudge = (dir) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 280), behavior: 'smooth' })
  }

  return (
    <div className="rail">
      <div className="rail-track" ref={trackRef} aria-label={label} tabIndex={0}>
        {children}
      </div>
      <button type="button" className="rail-btn prev" hidden={!canPrev} onClick={() => nudge(-1)} aria-label="Scroll products backward">
        ←
      </button>
      <button type="button" className="rail-btn next" hidden={!canNext} onClick={() => nudge(1)} aria-label="Scroll products forward">
        →
      </button>
    </div>
  )
}

export default Rail
