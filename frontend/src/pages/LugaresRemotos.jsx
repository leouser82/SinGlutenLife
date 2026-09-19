import { useEffect, useMemo, useRef, useState } from 'react'
import ChipRow from '../components/ChipRow.jsx'
import Pager from '../components/Pager.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import WorldPickMap from '../components/WorldPickMap.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'
import { rememberPlaces } from '../geo/placeCache.js'
import { distanceKm, reverseLabel, searchPlace } from '../geo/geo.js'
import { fetchRemotePlaces } from '../geo/places.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'

const PAGE_SIZE = 6

function usefulLabel(value) {
  const text = String(value || '').trim()
  if (!text || /buscando|searching|unavailable|cercando/i.test(text)) return ''
  return text
}

function isAbort(error) {
  return error?.name === 'AbortError' || /abort/i.test(String(error?.message || ''))
}

export default function LugaresRemotos() {
  const { t } = useI18n()
  const { coords, label: locLabel, status: locStatus } = useLocationData()
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState(() => (coords ? { lat: coords.lat, lon: coords.lon } : null))
  const [follow, setFollow] = useState(true)
  const [label, setLabel] = useState(coords ? locLabel : '')
  const [places, setPlaces] = useState([])
  const [status, setStatus] = useState('idle')
  const [tooWide, setTooWide] = useState(false)
  const [filter, setFilter] = useState('Todos')
  const [onlyDedicated, setOnlyDedicated] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const started = useRef(false)
  const reqId = useRef(0)
  const lastQuery = useRef(null)
  const abortRef = useRef(null)
  const busy = useRef(false)
  const pending = useRef(null)

  const filters = useMemo(() => {
    const types = [...new Set(places.map((place) => place.type))]
    return ['Todos', ...types]
  }, [places])

  const list = useMemo(() => {
    return places.filter((place) => {
      const byType = filter === 'Todos' || place.type === filter
      const byLevel = !onlyDedicated || place.level === 'dedicado'
      const text = `${place.name} ${place.address || ''} ${place.city || ''} ${(place.tags || []).join(' ')}`.toLowerCase()
      return byType && byLevel && text.includes(q.toLowerCase())
    })
  }, [places, q, filter, onlyDedicated])

  const dedicated = useMemo(() => places.filter((place) => place.level === 'dedicado').length, [places])
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [q, filter, onlyDedicated, label])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  async function lookAt(point, name, extra = {}) {
    const next = { lat: point.lat, lon: point.lon }
    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return
    const fly = extra.fly !== false
    const prev = lastQuery.current
    if (prev && extra.skipClose !== false && distanceKm(prev, next) < 0.8) return

    if (busy.current && extra.queue) {
      pending.current = { point: next, name, extra }
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    started.current = true
    busy.current = true
    const id = ++reqId.current
    lastQuery.current = next
    setPick(next)
    setFollow(fly)
    setTooWide(false)
    setStatus('loading')
    let hint = usefulLabel(name)
    setLabel(hint || `${next.lat.toFixed(3)}, ${next.lon.toFixed(3)}`)

    if (!hint) {
      try {
        const found = usefulLabel(await reverseLabel(next.lat, next.lon))
        if (id !== reqId.current) return
        if (found) {
          hint = found
          setLabel(found)
        }
      } catch {
        // seguimos con el punto
      }
    }

    try {
      const nearby = await fetchRemotePlaces(next.lat, next.lon, (partial) => {
        if (id !== reqId.current) return
        setPlaces(partial.places)
        rememberPlaces(partial.places, partial.pharmacies || [])
        if (partial.places.length) setStatus('ready')
      }, { bounds: extra.bounds, km: 40, signal: ac.signal, hint })
      if (id !== reqId.current) return
      setPlaces(nearby.places)
      rememberPlaces(nearby.places, nearby.pharmacies || [])
      setStatus('ready')
    } catch (error) {
      if (isAbort(error) || id !== reqId.current) return
      lastQuery.current = null
      setStatus('error')
    } finally {
      if (id === reqId.current) busy.current = false
      const queued = pending.current
      pending.current = null
      if (queued && id === reqId.current) {
        lookAt(queued.point, queued.name, { ...queued.extra, queue: false })
      }
    }
  }

  useEffect(() => {
    if (started.current || !coords || locStatus === 'locating') return
    started.current = true
    lookAt(coords, usefulLabel(locLabel), { fly: true, skipClose: false })
  }, [coords, locLabel, locStatus])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function onSearch(event) {
    event.preventDefault()
    setStatus('loading')
    try {
      const found = await searchPlace(query)
      if (!found) {
        setStatus(places.length ? 'ready' : 'idle')
        return
      }
      await lookAt(found, found.label, { fly: true, skipClose: false })
    } catch {
      setStatus('error')
    }
  }

  function onView(view) {
    if (!view) {
      setTooWide(true)
      return
    }
    setTooWide(false)
    lookAt(view, '', { fly: false, bounds: view.bounds, queue: true })
  }

  function goPage(next) {
    setPage(next)
    document.querySelector('.page .grid-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="page">
      <h2 className="page-title">{t('remote.title')}</h2>
      <p className="note" style={{ margin: '0 0 14px' }}>
        {t('remote.lead')}
      </p>
      <form className="remote-search" onSubmit={onSearch}>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('remote.search')}
        />
        <button type="submit" className="btn btn-light">
          {t('remote.searchBtn')}
        </button>
      </form>
      <p className="note">{t('remote.pick')}</p>
      <WorldPickMap pick={pick} places={places} follow={follow} onPick={(point) => lookAt(point, '', { fly: true })} onView={onView} />
      {!pick && locStatus === 'locating' ? <div className="banner-proto">{t('loc.searching')}</div> : null}
      {tooWide ? <div className="banner-proto">{t('remote.zoom')}</div> : null}
      {label ? (
        <div className="banner-proto">
          {status === 'loading' ? t('remote.loading', { label }) : t('remote.around', { label })}
        </div>
      ) : null}
      {status === 'ready' ? (
        <p className="note" style={{ margin: '0 0 14px' }}>
          {places.length ? t('remote.count', { n: places.length, dedicated, label }) : t('remote.empty', { label })}
        </p>
      ) : null}
      {status === 'error' ? <p className="note">{t('remote.error')}</p> : null}
      {places.length ? (
        <>
          <input
            className="search"
            placeholder={t('places.search')}
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <ChipRow>
            {filters.map((item) => (
              <button
                key={item}
                className={`filter ${filter === item ? 'active' : ''}`}
                onClick={() => setFilter(item)}
              >
                {item === 'Todos' ? t('places.all') : labelOf(t, 'type', item)}
              </button>
            ))}
            <button
              className={`filter gf ${onlyDedicated ? 'active' : ''}`}
              onClick={() => setOnlyDedicated((value) => !value)}
            >
              {t('places.onlyGf')}
            </button>
          </ChipRow>
          <div className="grid-cards">
            {visible.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
          <Pager page={page} pages={pages} onPage={goPage} />
          {list.length === 0 ? <p className="note">{t('places.noFilter')}</p> : null}
        </>
      ) : null}
    </main>
  )
}
