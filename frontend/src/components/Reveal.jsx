import { useEffect, useRef, useState } from 'react'

// One-shot scroll reveal. Adds .in when the section enters the viewport;
// disabled automatically under prefers-reduced-motion via CSS.
function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const delayCls = delay === 1 ? 'reveal-d1' : delay === 2 ? 'reveal-d2' : ''
  return (
    <Tag ref={ref} className={`reveal${inView ? ' in' : ''} ${delayCls} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}

export default Reveal
