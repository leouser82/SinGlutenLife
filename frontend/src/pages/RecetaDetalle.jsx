import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { formatDistance } from '../geo/geo.js'
import { loadGroceryShops, mapsShopUrl, shopForIngredient } from '../geo/ingredientShops.js'
import { useLocationData } from '../geo/LocationContext.jsx'
import { useCommunity } from '../community/CommunityContext.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import T from '../i18n/T.jsx'

export default function RecetaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { allRecipes } = useCommunity()
  const { coords, places, placesStatus } = useLocationData()
  const recipe = allRecipes.find((item) => item.id === id)
  const waiting = !recipe && String(id || '').startsWith('c-')
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
        <p>{waiting ? t('cook.loading') : t('recipe.missing')}</p>
        <Link className="linkish" to="/recetas">
          {t('recipe.back')}
        </Link>
      </main>
    )
  }

  return (
    <main className="page">
      <button className="back" onClick={() => navigate(-1)}>
        {t('place.back')}
      </button>
      {recipe.community ? <h2 className="page-title">{recipe.title}</h2> : <T as="h2" className="page-title" text={recipe.title} />}
      <RecipePhoto recipe={recipe} className="recipe-photo detail" />
      {recipe.community ? (
        <p className="note" style={{ marginTop: 0 }}>
          {recipe.summary}
        </p>
      ) : (
        <T as="p" className="note" style={{ marginTop: 0 }} text={recipe.summary} />
      )}
      <div className="row-stats" style={{ marginBottom: 8 }}>
        <span>{t('home.min', { n: recipe.minutes })}</span>
        <span>{t('home.servings', { n: recipe.servings })}</span>
        <span>{labelOf(t, 'diff', recipe.difficulty)}</span>
      </div>
      <p className="note">
        {recipe.community ? t('cook.byCook') : t('recipe.by')}{' '}
        {recipe.sourceUrl ? (
          <a className="maps-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            {recipe.sourceName}
          </a>
        ) : (
          <strong>{recipe.sourceName}</strong>
        )}
      </p>
      {recipe.community ? <p className="banner-proto">{t('cook.hint')}</p> : null}

      <h3 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{t('recipe.how')}</h3>
      <ol className="steps">
        {recipe.steps.map((step) =>
          recipe.community ? <li key={step}>{step}</li> : <T as="li" key={step} text={step} />,
        )}
      </ol>

      <h3 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{t('recipe.ings')}</h3>
      <p className="note">
        {shopStatus === 'loading' || placesStatus === 'loading' ? t('recipe.shopsLoading') : t('recipe.shopsReady')}
      </p>
      <div className="card">
        {recipe.ingredients.map((ing) => {
          const shop = shopForIngredient(ing, shops)
          return (
            <article className="ingredient" key={ing.name}>
              <div>
                {recipe.community ? <strong>{ing.name}</strong> : <T as="strong" text={ing.name} />}
                <div className="meta">
                  {ing.qty} · {labelOf(t, 'shop', ing.shop, t('shop.comercio'))}
                </div>
                {shop ? (
                  <div className="note" style={{ marginTop: 6 }}>
                    {shop.isSearch ? t('recipe.search') : t('recipe.near')}
                    {shop.name}
                    {shop.address ? ` · ${shop.address}` : ''}
                    {Number.isFinite(shop.distanceKm) ? ` · ${formatDistance(shop.distanceKm)}` : ''}
                  </div>
                ) : null}
              </div>
              {shop ? (
                <a className="maps-link" href={mapsShopUrl(shop, coords)} target="_blank" rel="noreferrer">
                  {shop.isSearch ? t('recipe.map') : t('card.directions')}
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
    </main>
  )
}
