import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistance, mapsDirectionsUrl } from '../geo/geo.js'
import { isOpenNow, todayLine } from '../geo/guideHours.js'
import { loadCardPhoto } from '../geo/placeDetails.js'
import { useLocationData } from '../geo/LocationContext.jsx'

/**
 * Shows a photo of this place or a neutral tile. Never a stock image.
 * Only starts looking once the card is close to the viewport.
 */
function PlaceThumb({ place }) {
  const { label } = useLocationData()
  const [src, setSrc] = useState(place.image || '')
  const holder = useRef(null)

  useEffect(() => {
    setSrc(place.image || '')
    if (place.image || !holder.current) return undefined

    let alive = true
    const node = holder.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        loadCardPhoto(place, label).then((url) => {
          if (alive && url) setSrc(url)
        })
      },
      { rootMargin: '300px' },
    )
    observer.observe(node)
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [place.id, place.image, label])

  if (!src) {
    return (
      <div className="place-thumb placeholder" ref={holder} aria-hidden="true">
        {String(place.name || '?').trim().charAt(0).toUpperCase()}
      </div>
    )
  }

  return <img className="place-thumb" ref={holder} src={src} alt="" loading="lazy" onError={() => setSrc('')} />
}

function GlutenTag({ place }) {
  if (place.level === 'dedicado') return <span className="tag ok">100% sin gluten</span>
  if (place.level === 'opciones') return <span className="tag ok">Opciones sin TACC</span>
  return null
}

export default function PlaceCard({ place, extra, to }) {
  const dist = formatDistance(place.distanceKm)
  const href = to || `/lugar/${encodeURIComponent(place.id)}`

  return (
    <Link to={href} className="card place-card">
      <PlaceThumb place={place} />
      <div>
        <h4>{place.name}</h4>
        <div className="meta">
          {place.type}
          {place.address ? ` · ${place.address}` : ''}
        </div>
        {todayLine(place.hours) ? <div className="meta">{todayLine(place.hours)}</div> : null}
      </div>
      <div className="distance">
        {dist}
        {place.lat ? (
          <span
            className="meta maps-link"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              window.open(mapsDirectionsUrl(place), '_blank', 'noopener,noreferrer')
            }}
          >
            Cómo llegar
          </span>
        ) : null}
      </div>
      <div className="tags">
        {isOpenNow(place.hours) === true ? <span className="tag ok">Abierto ahora</span> : null}
        <GlutenTag place={place} />
        {/mixta/i.test(place.kitchen || '') ? <span className="tag">Cocina mixta</span> : null}
        {(place.guides || []).length > 1 ? <span className="tag">En {place.guides.length} guías</span> : null}
        {extra}
      </div>
    </Link>
  )
}
