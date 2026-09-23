import { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '../geo/leaflet.js'

export default function PlaceMap({ lat, lon, fallback, onMove }) {
  const node = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onMoveRef = useRef(onMove)
  const fallbackRef = useRef(fallback)
  const latRef = useRef(lat)
  const lonRef = useRef(lon)
  const [ready, setReady] = useState(false)
  onMoveRef.current = onMove
  fallbackRef.current = fallback
  latRef.current = lat
  lonRef.current = lon

  useEffect(() => {
    let alive = true
    loadLeaflet()
      .then((L) => {
        if (!alive || !node.current || mapRef.current) return
        const start = fallbackRef.current
        const has = Number.isFinite(latRef.current) && Number.isFinite(lonRef.current)
        const center = has
          ? [latRef.current, lonRef.current]
          : Number.isFinite(start?.lat) && Number.isFinite(start?.lon)
            ? [start.lat, start.lon]
            : [-34.6037, -58.3816]
        const map = L.map(node.current).setView(center, has ? 16 : 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)
        map.on('click', (event) => {
          onMoveRef.current(event.latlng.lat, event.latlng.lng)
        })
        mapRef.current = map
        setReady(true)
        setTimeout(() => map.invalidateSize(), 80)
      })
      .catch(() => {})
    return () => {
      alive = false
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!ready || !map || !L) return
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    const pos = [lat, lon]
    if (!markerRef.current) {
      const marker = L.marker(pos, { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const point = marker.getLatLng()
        onMoveRef.current(point.lat, point.lng)
      })
      markerRef.current = marker
    } else {
      const current = markerRef.current.getLatLng()
      if (Math.abs(current.lat - lat) > 1e-7 || Math.abs(current.lng - lon) > 1e-7) markerRef.current.setLatLng(pos)
    }
    map.panTo(pos)
    if (map.getZoom() < 15) map.setZoom(16)
  }, [lat, lon, ready])

  return <div className="mine-map" ref={node} />
}
