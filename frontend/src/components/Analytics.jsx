import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const GA_ID = 'G-PFB4CNE7WZ'

export default function Analytics() {
  const { pathname, search } = useLocation()
  const skipFirst = useRef(true)

  useEffect(() => {
    const path = pathname + search
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    if (typeof window.gtag !== 'function') return
    window.gtag('config', GA_ID, {
      page_path: path,
      page_title: document.title,
      page_location: window.location.href,
    })
  }, [pathname, search])

  return null
}
