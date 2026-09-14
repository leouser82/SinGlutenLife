import { useState } from 'react'
import PlaceCard from '../components/PlaceCard.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'

export default function Farmacias() {
  const { pharmacies, placesStatus, label, locate, status } = useLocationData()
  const [q, setQ] = useState('')
  const list = pharmacies.filter((p) =>
    `${p.name} ${(p.products || []).join(' ')} ${p.address || ''}`.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <main className="page">
      <div className="banner-proto">
        {status === 'locating' || placesStatus === 'loading'
          ? `Buscando farmacias cerca de ${label}…`
          : `Farmacias reales cerca de ${label}. En Argentina suelen tener góndola sin TACC.`}
      </div>
      <h2 className="page-title">Farmacia, sin adivinar</h2>
      <p className="note" style={{ margin: '0 0 14px' }}>
        Las más cercanas a vos, con distancia real. Confirmá el sello en la góndola.
      </p>
      <input
        className="search"
        placeholder="Nombre o barrio…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid-cards">
        {list.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
      {placesStatus === 'loading' && <p className="note">Cargando farmacias cercanas…</p>}
      {placesStatus === 'ready' && list.length === 0 && (
        <p className="note">
          No encontramos farmacias cerca.{' '}
          <button type="button" className="text-btn" onClick={locate}>
            Actualizar ubicación
          </button>
        </p>
      )}
    </main>
  )
}