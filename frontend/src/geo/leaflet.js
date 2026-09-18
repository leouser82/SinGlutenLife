let ready

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      window.L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/'
      resolve(window.L)
    }
    script.onerror = () => reject(new Error('leaflet'))
    document.head.appendChild(script)
  })
  return ready
}
