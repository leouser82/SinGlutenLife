import { useEffect, useRef } from 'react'
import { loadLeaflet } from '../geo/leaflet.js'

export default function WorldPickMap({ pick, places = [], onPick }) {
  const holder = useRef(null)
  const mapRef = useRef(null)
  const layers = useRef({ pick: null, places: [] })
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    let gone = false
    loadLeaflet().then((L) => {
      if (gone || !holder.current || mapRef.current) return
      const map = L.map(holder.current, { worldCopyJump: true }).setView([20, 10], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)
      map.on('click', (event) => {
        onPickRef.current?.({ lat: event.latlng.lat, lon: event.latlng.lng })
      })
      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 80)
    })
    return () => {
      gone = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!map || !L || !pick) return
    layers.current.pick?.remove()
    layers.current.pick = L.marker([pick.lat, pick.lon]).addTo(map)
    map.flyTo([pick.lat, pick.lon], Math.max(map.getZoom(), 11), { duration: 0.6 })
  }, [pick?.lat, pick?.lon])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!map || !L) return
    layers.current.places.forEach((marker) => marker.remove())
    layers.current.places = places
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon))
      .slice(0, 80)
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
  }, [places])

  return <div className="remote-map" ref={holder} />
}
