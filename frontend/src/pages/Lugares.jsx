import { useMemo, useState } from 'react'
import AreaChips from '../components/AreaChips.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'

export default function Lugares() {
  const { places, placesStatus, label, locate, source, status, error } = useLocationData()
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [onlyDedicated, setOnlyDedicated] = useState(false)

  const filters = useMemo(() => {
    const types = [...new Set(places.map((p) => p.type))]
    return ['Todos', ...types]
  }, [places])

  const list = useMemo(() => {
    return places.filter((p) => {
      const byType = filter === 'Todos' || p.type === filter
      const byLevel = !onlyDedicated || p.level === 'dedicado'
      const text = `${p.name} ${p.address || ''} ${p.city || ''} ${(p.tags || []).join(' ')}`.toLowerCase()
      return byType && byLevel && text.includes(q.toLowerCase())
    })
  }, [places, q, filter, onlyDedicated])

  const dedicated = useMemo(() => places.filter((p) => p.level === 'dedicado').length, [places])

  const banner =
    status === 'locating' || placesStatus === 'loading'
      ? t('places.loading', { label })
      : source === 'gps'
        ? t('places.gps', { label })
        : source === 'ip'
          ? t('places.ip', { label })
          : source === 'manual'
            ? t('places.manual', { label })
            : error || t('places.noLoc')

  return (
    <main className="page">
      <div className="banner-proto">{banner}</div>
      <h2 className="page-title">{t('places.title')}</h2>
      <p className="note" style={{ margin: '0 0 14px' }}>
        {places.length
          ? t('places.count', { n: places.length, dedicated })
          : t('places.none')}
      </p>
      {placesStatus === 'ready' && places.length > 0 && places.length < 12 ? (
        <p className="banner-proto">{t('places.thin', { n: places.length })}</p>
      ) : null}
      <p className="note">{t('places.otherCity')}</p>
      <AreaChips />
      <input
        className="search"
        placeholder={t('places.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="filters">
        {filters.map((f) => (
          <button key={f} className={`filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'Todos' ? t('places.all') : labelOf(t, 'type', f)}
          </button>
        ))}
        <button
          className={`filter gf ${onlyDedicated ? 'active' : ''}`}
          onClick={() => setOnlyDedicated((value) => !value)}
        >
          {t('places.onlyGf')}
        </button>
      </div>
      <div className="grid-cards">
        {list.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
      {placesStatus === 'loading' && <p className="note">{t('places.loadingList')}</p>}
      {placesStatus === 'ready' && places.length === 0 && (
        <p className="note">
          {t('places.emptyKm', { label })}
          <button type="button" className="text-btn" onClick={locate}>
            {t('places.useGps')}
          </button>
          .
        </p>
      )}
      {placesStatus === 'ready' && places.length > 0 && list.length === 0 && (
        <p className="note">{t('places.noFilter')}</p>
      )}
    </main>
  )
}
