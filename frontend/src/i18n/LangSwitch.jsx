import { useEffect, useRef, useState } from 'react'
import Flag from './Flags.jsx'
import { useI18n } from './LanguageContext.jsx'

export default function LangSwitch() {
  const { lang, setLang, langs } = useI18n()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const current = langs.find((item) => item.id === lang) || langs[0]

  useEffect(() => {
    if (!open) return
    function onPointer(event) {
      if (!box.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`lang-switch${open ? ' open' : ''}`} ref={box}>
      <button
        type="button"
        className="lang-switch-toggle"
        aria-label={current.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Flag id={current.id} />
      </button>
      {open ? (
        <div className="lang-menu" role="listbox" aria-label={current.label}>
          {langs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === lang}
              className={item.id === lang ? 'active' : ''}
              onClick={() => {
                setLang(item.id)
                setOpen(false)
              }}
            >
              <Flag id={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
