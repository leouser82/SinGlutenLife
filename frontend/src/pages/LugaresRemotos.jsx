import { useEffect, useMemo, useState } from 'react'
import ChipRow from '../components/ChipRow.jsx'
import Pager from '../components/Pager.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import WorldPickMap from '../components/WorldPickMap.jsx'
import { rememberPlaces } from '../geo/placeCache.js'
import { reverseLabel, searchPlace } from '../geo/geo.js'
import { fetchRemotePlaces } from '../geo/places.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'

const PAGE_SIZE = 6

export default function LugaresRemotos() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState(null)
  const [label, setLabel] = useState('')
  const [places, setPlaces] = useState([])
  const [status, setStatus] = useState('idle')
  const [filter, setFilter] = useState('Todos')
  const [onlyDedicated, setOnlyDedicated] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

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

  async function choose(point, name) {
    const next = { lat: point.lat, lon: point.lon }
    setPick(next)
    setStatus('loading')
    setPlaces([])
    setLabel(name || `${next.lat.toFixed(3)}, ${next.lon.toFixed(3)}`)
    try {
      const found = name || (await reverseLabel(next.lat, next.lon))
      setLabel(found)
    } catch {
      // coords
    }
    try {
      const nearby = await fetchRemotePlaces(next.lat, next.lon, (partial) => {
        setPlaces(partial.places)
        rememberPlaces(partial.places, partial.pharmacies || [])
        if (partial.places.length) setStatus('ready')
      })
      setPlaces(nearby.places)
      rememberPlaces(nearby.places, nearby.pharmacies || [])
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  async function onSearch(event) {
    event.preventDefault()
    setStatus('loading')
    try {
      const found = await searchPlace(query)
      if (!found) {
        setStatus('idle')
        setLabel('')
        return
      }
      await choose(found, found.label)
    } catch {
      setStatus('error')
    }
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
      <WorldPickMap pick={pick} places={places} onPick={(point) => choose(point)} />
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
