import { useMemo, useState } from 'react'
import AreaChips from '../components/AreaChips.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'

export default function Lugares() {
  const { places, placesStatus, label, locate, source, status, error } = useLocationData()
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

  return (
    <main className="page">
      <div className="banner-proto">
        {status === 'locating' || placesStatus === 'loading'
          ? `Buscando lugares sin TACC cerca de ${label}…`
          : source === 'gps'
            ? `Ubicación real · ${label}. Distancia medida en línea recta.`
            : source === 'ip'
              ? `Ubicación aproximada por red · ${label}. Tocá el pin de arriba para usar el GPS.`
              : source === 'manual'
                ? `Ciudad elegida · ${label}. Distancia desde el centro.`
                : error || 'No pudimos leer tu ubicación. Elegí una ciudad o tocá el pin.'}
      </div>
      <h2 className="page-title">¿Dónde comemos hoy?</h2>
      <p className="note" style={{ margin: '0 0 14px' }}>
        {places.length
          ? `${places.length} lugares publicados a menos de 25 km, ${dedicated} con cocina 100% libre de gluten. Confirmá siempre el protocolo en el local.`
          : 'Solo mostramos locales ya publicados como sin TACC. Si no está en esas listas, acá no lo inventamos.'}
      </p>
      {placesStatus === 'ready' && places.length > 0 && places.length < 12 ? (
        <p className="banner-proto">
          Poca cobertura en esta zona: hay {places.length} locales publicados. No inventamos el resto.
          Probá otra ciudad.
        </p>
      ) : null}
      <p className="note">Mirar otra ciudad</p>
      <AreaChips />
      <input
        className="search"
        placeholder="Buscar por nombre, barrio o dirección…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="filters">
        {filters.map((f) => (
          <button key={f} className={`filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <button
          className={`filter gf ${onlyDedicated ? 'active' : ''}`}
          onClick={() => setOnlyDedicated((value) => !value)}
        >
          Solo 100% sin gluten
        </button>
      </div>
      <div className="grid-cards">
        {list.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
      {placesStatus === 'loading' && <p className="note">Cargando locales…</p>}
      {placesStatus === 'ready' && places.length === 0 && (
        <p className="note">
          No hay locales publicados a 25 km de {label}. Elegí una ciudad arriba o{' '}
          <button type="button" className="text-btn" onClick={locate}>
            usá el GPS
          </button>
          .
        </p>
      )}
      {placesStatus === 'ready' && places.length > 0 && list.length === 0 && (
        <p className="note">No hay resultados con ese filtro.</p>
      )}
    </main>
  )
}
