import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'

function Arrow({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={dir === 'prev' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ChipRow({ children, className = 'filters' }) {
  const { t } = useI18n()
  const scroller = useRef(null)
  const [overflow, setOverflow] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return

    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const extra = max > 8
      setOverflow(extra)
      setCanPrev(el.scrollLeft > 6)
      setCanNext(el.scrollLeft < max - 6)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 6)
    setCanNext(el.scrollLeft < max - 6)
  }, [overflow])

  function step(dir) {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.72), behavior: 'smooth' })
  }

  return (
    <div className={`chip-row${overflow ? ' has-arrows' : ''}${canPrev ? ' scrolled-start' : ''}`}>
      {overflow ? (
        <button
          type="button"
          className="chip-arrow"
          disabled={!canPrev}
          onClick={() => step(-1)}
          aria-label={t('chip.prev')}
        >
          <Arrow dir="prev" />
        </button>
      ) : null}
      <div className={`${className} chip-scroller`} ref={scroller}>
        {children}
      </div>
      {overflow ? (
        <button
          type="button"
          className="chip-arrow"
          disabled={!canNext}
          onClick={() => step(1)}
          aria-label={t('chip.next')}
        >
          <Arrow dir="next" />
        </button>
      ) : null}
    </div>
  )
}
