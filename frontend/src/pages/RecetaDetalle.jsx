import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { recipes } from '../data/recipes.js'
import { formatDistance } from '../geo/geo.js'
import { loadGroceryShops, mapsShopUrl, shopForIngredient, shopKindLabel } from '../geo/ingredientShops.js'
import { useLocationData } from '../geo/LocationContext.jsx'

export default function RecetaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { coords, places, placesStatus } = useLocationData()
  const recipe = recipes.find((item) => item.id === id)
  const [shops, setShops] = useState([])
  const [shopStatus, setShopStatus] = useState('idle')

  useEffect(() => {
    let alive = true
    setShopStatus('loading')
    loadGroceryShops(coords, places)
      .then((list) => {
        if (!alive) return
        setShops(list)
        setShopStatus(list.length ? 'ready' : 'empty')
      })
      .catch(() => {
        if (alive) setShopStatus('empty')
      })
    return () => {
      alive = false
    }
  }, [coords?.lat, coords?.lon, places])

  if (!recipe) {
    return (
      <main className="page">
        <p>No encontramos esa receta.</p>
        <Link className="linkish" to="/recetas">
          Volver
        </Link>
      </main>
    )
  }

  return (
    <main className="page">
      <button className="back" onClick={() => navigate(-1)}>
        ← Volver
      </button>
      <h2 className="page-title">{recipe.title}</h2>
      <RecipePhoto recipe={recipe} className="recipe-photo detail" />
      <p className="note" style={{ marginTop: 0 }}>
        {recipe.summary}
      </p>
      <div className="row-stats" style={{ marginBottom: 8 }}>
        <span>{recipe.minutes} min</span>
        <span>{recipe.servings} porciones</span>
        <span>{recipe.difficulty}</span>
      </div>
      <p className="note">
        Receta de{' '}
        <a className="maps-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          {recipe.sourceName}
        </a>
      </p>

      <h3 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Cómo se prepara</h3>
      <ol className="steps">
        {recipe.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Ingredientes y dónde comprarlos</h3>
      <p className="note">
        {shopStatus === 'loading' || placesStatus === 'loading'
          ? 'Buscando comercios cerca de tu ubicación…'
          : 'Un comercio cercano para cada cosa. En productos envasados, pedí el logo sin TACC.'}
      </p>
      <div className="card">
        {recipe.ingredients.map((ing) => {
          const shop = shopForIngredient(ing, shops)
          return (
            <article className="ingredient" key={ing.name}>
              <div>
                <strong>{ing.name}</strong>
                <div className="meta">
                  {ing.qty} · {shopKindLabel(ing.shop)}
                </div>
                {shop ? (
                  <div className="note" style={{ marginTop: 6 }}>
                    {shop.isSearch ? 'Buscar: ' : 'Cerca: '}
                    {shop.name}
                    {shop.address ? ` · ${shop.address}` : ''}
                    {Number.isFinite(shop.distanceKm) ? ` · ${formatDistance(shop.distanceKm)}` : ''}
                  </div>
                ) : null}
              </div>
              {shop ? (
                <a className="maps-link" href={mapsShopUrl(shop, coords)} target="_blank" rel="noreferrer">
                  {shop.isSearch ? 'Ver en el mapa' : 'Cómo llegar'}
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
    </main>
  )
}
