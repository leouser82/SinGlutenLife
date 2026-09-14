import { Link } from 'react-router-dom'
import AreaChips from '../components/AreaChips.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { recipeOfTheDay, recipes } from '../data/recipes.js'
import { isOpenNow } from '../geo/guideHours.js'
import { useLocationData } from '../geo/LocationContext.jsx'

export default function Home() {
  const { places, placesStatus, label, status, locate, source, error } = useLocationData()
  const nearby = [...places].sort((a, b) => a.distanceKm - b.distanceKm)
  const nearest = nearby[0]
  const daily = recipeOfTheDay()
  const openNow = nearby.filter((place) => isOpenNow(place.hours) === true).slice(0, 3)
  const thinCoverage = placesStatus === 'ready' && places.length > 0 && places.length < 12
  const waitingPlaces = status === 'locating' || placesStatus === 'loading'

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-kicker">Cerca · En casa · Sin TACC</div>
        <h2>Hola, hoy la mesa está de tu lado.</h2>
        <p>
          Encontrá dónde sentarte cerca y, si te quedás en casa, hay receta nueva todos los días — con
          dónde comprar lo que falta. En el local preguntá igual: esto no reemplaza el protocolo del
          lugar.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-light" to="/lugares">
            Ver qué hay cerca
          </Link>
          <Link className="btn btn-ghost" to={`/recetas/${daily.id}`}>
            Receta del día
          </Link>
        </div>
        <div className="badge-row">
          <span className="badge">Celíaco / intolerante</span>
          <span className="badge">Argentina</span>
        </div>
      </section>

      <p className="trust-line">
        No adivinamos si un lugar es seguro. Solo aparecen locales ya publicados como sin TACC. En el
        mostrador, confirmá igual.
      </p>

      <div className="section-head">
        <h3>Receta de hoy</h3>
        <Link to="/recetas">Ver todas</Link>
      </div>
      <Link className="card recipe-feature" to={`/recetas/${daily.id}`}>
        <RecipePhoto recipe={daily} className="recipe-photo on-blue" />
        <span className="recipe-feature-kicker">Cambia cada día · {daily.sourceName}</span>
        <h4>{daily.title}</h4>
        <p>{daily.summary}</p>
        <div className="row-stats" style={{ marginTop: 10 }}>
          <span>{daily.minutes} min</span>
          <span>{daily.servings} porciones</span>
          <span>{daily.difficulty}</span>
        </div>
      </Link>

      <div className="section-head">
        <h3>
          {waitingPlaces
            ? 'Buscando locales cerca'
            : source === 'manual'
              ? `Cerca de ${label}`
              : `Cerca de ${label === 'Buscando…' ? 'vos' : label}`}
        </h3>
        <Link to="/lugares">Ver lista</Link>
      </div>
      {error ? (
        <p className="note">
          {error}{' '}
          <button type="button" className="text-btn" onClick={locate}>
            Usar GPS
          </button>
        </p>
      ) : null}
      {thinCoverage ? (
        <p className="banner-proto">
          En esta zona hay {places.length} locales publicados. Eso no significa que no haya más:
          todavía no los tenemos cargados. Podés mirar otra ciudad.
        </p>
      ) : null}
      {placesStatus === 'ready' && places.length === 0 ? (
        <p className="banner-proto">
          No hay locales publicados a menos de 25 km. Elegí una ciudad con más cobertura o actualizá el
          GPS.
        </p>
      ) : null}
      <p className="note" style={{ marginBottom: 8 }}>
        Si el GPS tarda o no está, elegí una ciudad. Las distancias se miden desde ese punto.
      </p>
      <AreaChips />

      {openNow.length ? (
        <>
          <div className="section-head">
            <h3>Abiertos ahora</h3>
          </div>
          <p className="note" style={{ marginTop: 0 }}>
            Según el horario que publicó la guía. Confirmá en el local.
          </p>
          {openNow.map((place) => (
            <PlaceCard key={place.id} place={place} extra={<span className="tag ok">Abierto ahora</span>} />
          ))}
        </>
      ) : null}

      {nearest ? (
        <>
          <div className="section-head">
            <h3>El más cercano</h3>
            <Link to="/lugares">Ver todas</Link>
          </div>
          <PlaceCard place={nearest} />
        </>
      ) : waitingPlaces ? (
        <p className="note">Estamos buscando locales cerca de tu zona…</p>
      ) : null}

      <div className="section-head">
        <h3>Cocinar en casa</h3>
        <Link to="/recetas">{recipes.length} recetas</Link>
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        Cada día hay una distinta. En la ficha, el paso a paso y un comercio cerca para cada
        ingrediente.
      </p>
    </main>
  )
}
