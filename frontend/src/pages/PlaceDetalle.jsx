import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDistance, mapsDirectionsUrl, mapsUrl } from '../geo/geo.js'
import { hoursLines } from '../geo/guideHours.js'
import { getCachedPlace } from '../geo/placeCache.js'
import { formatArs, getCachedReviews, loadPlaceDetails, loadPlaceReviews, mergeReviewPack } from '../geo/placeDetails.js'
import { useLocationData } from '../geo/LocationContext.jsx'

const EMPTY_REVIEWS = { reviews: [], rating: null, reviewCount: null, mapsUrl: '' }

function offerKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sameOffer(a, b) {
  const left = offerKey(a)
  const right = offerKey(b)
  if (!left || !right) return false
  if (left === right) return true
  const [short, long] = left.length <= right.length ? [left, right] : [right, left]
  return short.length >= 10 && long.includes(short)
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function buildOfferCards(details, mentions, menu) {
  const cards = []

  const add = (card) => {
    const text = String(card.text || '').trim()
    if (!text) return
    const twin = cards.find((item) => sameOffer(item.text, text))
    if (twin) {
      if (text.length > twin.text.length) twin.text = text
      twin.gf = twin.gf || card.gf
      twin.price = twin.price || card.price
      twin.source = twin.source || card.source
      if (card.note && !twin.notes.includes(card.note)) twin.notes.push(card.note)
      return
    }
    cards.push({
      text,
      source: card.source || '',
      gf: Boolean(card.gf),
      price: card.price || null,
      notes: card.note ? [card.note] : [],
    })
  }

  for (const item of mentions) {
    add({
      text: item.text,
      source: item.source,
      gf: true,
    })
  }

  for (const item of menu) {
    add({
      text: item.name,
      source: details?.website || details?.sources?.[0] || '',
      gf: Boolean(item.gf),
      price: item.price || null,
      note: item.gf ? 'Sin TACC' : 'Publicado en su web',
    })
  }

  const site = details?.menuUrl || details?.website || ''
  if (site && !cards.some((card) => hostOf(card.source) && hostOf(card.source) === hostOf(site))) {
    add({
      text: details?.menuUrl ? 'Carta o menú publicado por el local' : 'Sitio del local',
      source: site,
      note: hostOf(site),
    })
  }

  return cards
}

export default function PlaceDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { places, pharmacies, label } = useLocationData()
  const decoded = decodeURIComponent(id || '')
  const place =
    [...places, ...pharmacies].find((item) => item.id === decoded) || getCachedPlace(decoded)

  const [details, setDetails] = useState(null)
  const [reviewPack, setReviewPack] = useState(() => getCachedReviews(decoded) || EMPTY_REVIEWS)
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [tab, setTab] = useState('fotos')
  const [broken, setBroken] = useState(() => new Set())

  const dropPhoto = (url) => setBroken((prev) => new Set(prev).add(url))

  useEffect(() => {
    setReviewPack(getCachedReviews(place?.id) || EMPTY_REVIEWS)
    setDetails(null)
    setPhotoIndex(0)
  }, [place?.id])

  useEffect(() => {
    if (!place) return
    let alive = true
    setLoading(true)
    loadPlaceDetails(place, label, (data) => {
      if (!alive) return
      setDetails(data)
      if (data?.reviews?.length || data?.rating) {
        setReviewPack((current) => mergeReviewPack(current, data))
      }
      setLoading(false)
    }).finally(() => {
      if (alive) setLoading(false)
    })
    loadPlaceReviews(place, label).then((extra) => {
      if (!alive) return
      if (!extra?.reviews?.length && !extra?.rating) return
      setReviewPack((current) => mergeReviewPack(current, extra))
    })
    return () => {
      alive = false
    }
  }, [place?.id, label])

  if (!place) {
    return (
      <main className="page">
        <p>No encontramos ese lugar. Volvé a la lista para cargarlo de nuevo.</p>
        <Link className="linkish" to="/lugares">
          Ver lugares
        </Link>
      </main>
    )
  }

  const photos = (details?.photos || []).filter((url) => !broken.has(url))
  const photo = photos[photoIndex] || photos[0] || ''
  const menu = details?.menu || []
  const reviews = reviewPack.reviews
  const rating = reviewPack.rating || details?.rating || null
  const reviewCount = reviewPack.reviewCount || details?.reviewCount || null
  const hours = details?.hours || { rows: [], openLabel: '' }
  const features = details?.features || []
  const gfMentions = details?.gfMentions || []
  const offers = buildOfferCards(details, gfMentions, menu)
  const gfConfirmed = place.certified || details?.gfOfficial || details?.gfState === 'confirmado'

  const tabs = [
    { id: 'fotos', label: 'Fotos' },
    offers.length ? { id: 'menu', label: 'Menú' } : null,
    { id: 'horarios', label: 'Horarios' },
    { id: 'opiniones', label: 'Opiniones' },
  ].filter(Boolean)

  return (
    <main className="page">
      <button className="back" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <p className="meta" style={{ margin: '0 0 4px' }}>
        {place.type} · {formatDistance(place.distanceKm)}
      </p>
      <h2 className="page-title">{place.name}</h2>
      {rating ? (
        <p className="place-rating">
          <strong>{String(rating).replace('.', ',')}</strong>
          <span className="stars">{'★★★★★'.slice(0, Math.round(rating))}</span>
          {reviewCount ? <span>({reviewCount})</span> : null}
        </p>
      ) : null}
      {place.address ? <p className="note" style={{ marginTop: 0 }}>{place.address}</p> : null}

      <div className="tags" style={{ marginBottom: 14 }}>
        {place.level === 'dedicado' || gfConfirmed ? (
          <span className="tag ok">100% sin gluten</span>
        ) : place.level === 'opciones' || gfMentions.length ? (
          <span className="tag ok">Opciones sin TACC</span>
        ) : (
          <span className="tag warn">Sin TACC sin confirmar</span>
        )}
        {details?.cuisine ? <span className="tag">{details.cuisine}</span> : null}
        {hours.openLabel ? <span className="tag ok">{hours.openLabel}</span> : null}
      </div>

      <section id="fotos" className="place-gallery">
        <div className="place-gallery-main">
          {photo ? (
            <img src={photo} alt={place.name} onError={() => dropPhoto(photo)} />
          ) : details?.mapEmbed ? (
            <iframe title="Mapa" src={details.mapEmbed} className="place-map" />
          ) : (
            <div className="place-photo-empty">Todavía no hay fotos de este local</div>
          )}
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="gallery-nav prev"
                onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav next"
                onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
              >
                ›
              </button>
              <span className="gallery-count">
                {photoIndex + 1}/{photos.length}
              </span>
            </>
          ) : null}
        </div>
        {photos.length > 1 ? (
          <div className="place-gallery-side">
            {photos.slice(0, 3).map((url, index) => (
              <button
                type="button"
                key={url}
                className={index === photoIndex ? 'active' : ''}
                onClick={() => setPhotoIndex(index)}
              >
                <img src={url} alt="" onError={() => dropPhoto(url)} />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <nav className="place-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => {
              setTab(item.id)
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {loading ? <p className="note">Buscando fotos, horarios y datos publicados del local…</p> : null}

      <div className="place-split">
        <section className="card place-block">
          <h3>Sobre el lugar</h3>
          <p>{details?.about || `${place.name} es una ${place.type.toLowerCase()}${place.address ? ` en ${place.address}` : ''}.`}</p>
          {details?.guideFacts?.length ? (
            <dl className="guide-facts">
              {details.guideFacts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {details?.phone ? <p className="note">Tel: {details.phone}</p> : null}
          {features.length ? (
            <ul className="feature-list">
              {features.map((item) => (
                <li key={item.label}>
                  {item.ok ? '✓' : '✕'} {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="card place-block" id="menu">
          <h3>Qué ofrecen sin TACC</h3>
          {offers.length ? (
            <div className="gf-evidence">
              {offers.map((item) => (
                <article className="offer-card" key={item.text.slice(0, 48)}>
                  <p>{item.text}</p>
                  <div className="offer-meta">
                    {item.gf ? <span className="tag ok">Sin TACC</span> : null}
                    {item.notes
                      .filter((note) => note && note !== 'Sin TACC')
                      .map((note) => (
                        <span className="tag" key={note}>
                          {note}
                        </span>
                      ))}
                    {item.price ? <strong>{formatArs(item.price)}</strong> : null}
                    {item.source ? (
                      <a href={item.source} target="_blank" rel="noreferrer">
                        {hostOf(item.source) || 'Fuente'}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="note">
              No encontramos ninguna publicación del local sobre sin TACC. Preguntá antes de comprar.
            </p>
          )}
        </section>
      </div>

      <div className="place-split">
        <section className="card place-block">
          <h3>Ubicación</h3>
          {place.address ? <p>{place.address}</p> : null}
          <a className="maps-link" href={mapsUrl(place)} target="_blank" rel="noreferrer">
            Ver en Google Maps
          </a>
          {details?.mapEmbed ? <iframe title="Mapa del lugar" src={details.mapEmbed} className="place-map-embed" /> : null}
        </section>
        <section className="card place-block" id="horarios">
          <div className="hours-head">
            <h3>Horarios</h3>
            {hours.openLabel ? <span className="tag ok">{hours.openLabel}</span> : null}
          </div>
          {hours.rows.length ? (
            <ul className="hours-list">
              {hours.rows.map((row) => (
                <li key={row.key} className={row.range === 'Cerrado' ? 'off' : ''}>
                  <span>{row.day}</span>
                  <strong>{row.range}</strong>
                </li>
              ))}
            </ul>
          ) : hoursLines(details?.hoursRaw).length ? (
            <ul className="hours-list plain">
              {hoursLines(details.hoursRaw).map((line) => (
                <li key={line}>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : hours.openLabel ? (
            <p>{hours.openLabel}</p>
          ) : (
            <p className="note">No hay horario publicado para este local.</p>
          )}
        </section>
      </div>

      <section className="card place-block" id="opiniones">
        <h3>Opiniones</h3>
        {rating ? (
          <p className="note">
            {String(rating).replace('.', ',')} estrellas en Google
            {reviewCount ? ` · ${reviewCount} opiniones` : ''}
          </p>
        ) : null}
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article key={review.text.slice(0, 24)}>
                <h4>{review.author}</h4>
                <p>{review.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="note">Todavía no hay reseñas públicas para mostrar. Podés ver más en Google.</p>
        )}
        {details?.guideUrl ? (
            <p className="note" style={{ marginTop: 10 }}>
              Figura en{' '}
              <a className="maps-link" href={details.guideUrl} target="_blank" rel="noreferrer">
                {(details.guides || []).join(' y ') || 'la guía sin TACC'}
              </a>
            </p>
          ) : null}
          {details?.sources?.length ? (
          <p className="note" style={{ marginTop: 10 }}>
            Datos públicos de {details.sources.map((url) => new URL(url).hostname.replace(/^www\./, '')).join(', ')}
          </p>
        ) : null}
        <a className="btn btn-light" style={{ marginTop: 12 }} href={mapsUrl(place)} target="_blank" rel="noreferrer">
          Ver opiniones en Google
        </a>
      </section>

      <div className="hero-actions" style={{ marginTop: 18 }}>
        <a className="btn btn-light" href={mapsDirectionsUrl(place)} target="_blank" rel="noreferrer">
          Cómo llegar
        </a>
        {details?.website ? (
          <a className="btn btn-ghost" href={details.website} target="_blank" rel="noreferrer">
            Sitio o menú
          </a>
        ) : null}
      </div>
    </main>
  )
}
