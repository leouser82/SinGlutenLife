import { useEffect, useState } from 'react'
import { useI18n } from './LanguageContext.jsx'
import { translateText } from './translate.js'

export function useTranslated(text) {
  const { lang } = useI18n()
  const source = String(text || '')
  const [out, setOut] = useState(source)

  useEffect(() => {
    let alive = true
    if (!source || lang === 'es') {
      setOut(source)
      return undefined
    }
    setOut(source)
    translateText(source, lang).then((value) => {
      if (alive) setOut(value)
    })
    return () => {
      alive = false
    }
  }, [source, lang])

  return out
}

export default function T({ text, as: Tag = 'span', className, ...rest }) {
  const value = useTranslated(text)
  return (
    <Tag className={className} {...rest}>
      {value}
    </Tag>
  )
}
