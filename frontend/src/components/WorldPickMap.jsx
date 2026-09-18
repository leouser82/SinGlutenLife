import { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '../geo/leaflet.js'

export default function WorldPickMap({ pick, places = [], follow = true, onPick, onView }) {
  const holder = useRef(null)
  const mapRef = useRef(null)
  const layers = useRef({ pick: null, places: [] })
  const onPickRef = useRef(onPick)
  const onViewRef = useRef(onView)
  const pickRef = useRef(pick)
  const skipUntil = useRef(0)
  const canSearchMove = useRef(false)
  const moveTimer = useRef(0)
  const [ready, setReady] = useState(false)
  onPickRef.current = onPick
  onViewRef.current = onView
  pickRef.current = pick

  useEffect(() => {
    let gone = false
    loadLeaflet().then((L) => {
      if (gone || !holder.current || mapRef.current) return
      const start = pickRef.current
      const map = L.map(holder.current, { worldCopyJump: true }).setView(
        start ? [start.lat, start.lon] : [20, 10],
        start ? 12 : 2,
      )
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)
      function reportView() {
        if (Date.now() < skipUntil.current || !canSearchMove.current) return
        window.clearTimeout(moveTimer.current)
        moveTimer.current = window.setTimeout(() => {
          if (Date.now() < skipUntil.current) return
          const zoom = map.getZoom()
          if (zoom < 9) {
            onViewRef.current?.(null)
            return
          }
          const center = map.getCenter()
          const box = map.getBounds()
          onViewRef.current?.({
            lat: center.lat,
            lon: center.lng,
            zoom,
            bounds: {
              south: box.getSouth(),
              west: box.getWest(),
              north: box.getNorth(),
              east: box.getEast(),
            },
          })
        }, 1100)
      }
      map.on('click', (event) => {
        onPickRef.current?.({ lat: event.latlng.lat, lon: event.latlng.lng })
      })
      map.on('dragend', reportView)
      map.on('zoomend', reportView)
      mapRef.current = map
      if (start) canSearchMove.current = true
      skipUntil.current = Date.now() + 900
      setReady(true)
      setTimeout(() => map.invalidateSize(), 80)
    })
    return () => {
      gone = true
      window.clearTimeout(moveTimer.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!ready || !map || !L || !pick) return
    layers.current.pick?.remove()
    layers.current.pick = L.marker([pick.lat, pick.lon]).addTo(map)
    if (!follow) {
      canSearchMove.current = true
      return
    }
    skipUntil.current = Date.now() + 1100
    map.flyTo([pick.lat, pick.lon], Math.max(map.getZoom(), 12), { duration: 0.55 })
    map.once('moveend', () => {
      skipUntil.current = Date.now() + 250
      canSearchMove.current = true
    })
  }, [ready, pick?.lat, pick?.lon, follow])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!ready || !map || !L) return
    layers.current.places.forEach((marker) => marker.remove())
    layers.current.places = places
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon))
      .slice(0, 40)
      .map((place) =>
        L.circleMarker([place.lat, place.lon], {
          radius: 7,
          color: '#0b6ea8',
          fillColor: '#7ec8e8',
          fillOpacity: 0.95,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(place.name)
          .on('click', (event) => window.L?.DomEvent.stopPropagation(event)),
      )
  }, [ready, places])

  return <div className="remote-map" ref={holder} />
}
