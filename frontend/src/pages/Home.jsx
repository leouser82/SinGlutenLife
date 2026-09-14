import { Link } from 'react-router-dom'
import AreaChips from '../components/AreaChips.jsx'
import PlaceCard from '../components/PlaceCard.jsx'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { recipeOfTheDay, recipes } from '../data/recipes.js'
import { isOpenNow } from '../geo/guideHours.js'
import { useLocationData } from '../geo/LocationContext.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import T from '../i18n/T.jsx'

export default function Home() {
  const { places, placesStatus, label, status, locate, source, error } = useLocationData()
  const { t } = useI18n()
  const nearby = [...places].sort((a, b) => a.distanceKm - b.distanceKm)
  const nearest = nearby[0]
  const daily = recipeOfTheDay()
  const openNow = nearby.filter((place) => isOpenNow(place.hours) === true).slice(0, 3)
  const thinCoverage = placesStatus === 'ready' && places.length > 0 && places.length < 12
  const waitingPlaces = status === 'locating' || placesStatus === 'loading'
  const nearTitle = waitingPlaces
    ? t('home.searchingNear')
    : source === 'manual' || (label && label !== t('loc.searching'))
      ? t('home.nearOf', { label })
      : t('home.nearYou')

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-kicker">{t('hero.kicker')}</div>
        <h2>{t('hero.title')}</h2>
        <p>{t('hero.body')}</p>
        <div className="hero-actions">
          <Link className="btn btn-light" to="/lugares">
            {t('hero.near')}
          </Link>
          <Link className="btn btn-ghost" to={`/recetas/${daily.id}`}>
            {t('hero.daily')}
          </Link>
        </div>
        <div className="badge-row">
          <span className="badge">{t('hero.badgeCeliac')}</span>
          <span className="badge">{t('hero.badgeAr')}</span>
        </div>
      </section>

      <p className="trust-line">{t('home.trust')}</p>

      <div className="section-head">
        <h3>{t('home.recipeToday')}</h3>
        <Link to="/recetas">{t('home.seeAll')}</Link>
      </div>
      <Link className="card recipe-feature" to={`/recetas/${daily.id}`}>
        <RecipePhoto recipe={daily} className="recipe-photo on-blue" />
        <span className="recipe-feature-kicker">{t('home.dailyKicker', { source: daily.sourceName })}</span>
        <T as="h4" text={daily.title} />
        <T as="p" text={daily.summary} />
        <div className="row-stats" style={{ marginTop: 10 }}>
          <span>{t('home.min', { n: daily.minutes })}</span>
          <span>{t('home.servings', { n: daily.servings })}</span>
          <span>{labelOf(t, 'diff', daily.difficulty)}</span>
        </div>
      </Link>

      <div className="section-head">
        <h3>{nearTitle}</h3>
        <Link to="/lugares">{t('home.seeList')}</Link>
      </div>
      {error ? (
        <p className="note">
          {error}{' '}
          <button type="button" className="text-btn" onClick={locate}>
            {t('home.useGps')}
          </button>
        </p>
      ) : null}
      {thinCoverage ? <p className="banner-proto">{t('home.thin', { n: places.length })}</p> : null}
      {placesStatus === 'ready' && places.length === 0 ? (
        <p className="banner-proto">{t('home.empty')}</p>
      ) : null}
      <p className="note" style={{ marginBottom: 8 }}>
        {t('home.pickCity')}
      </p>
      <AreaChips />

      {openNow.length ? (
        <>
          <div className="section-head">
            <h3>{t('home.openNow')}</h3>
          </div>
          <p className="note" style={{ marginTop: 0 }}>
            {t('home.openNote')}
          </p>
          {openNow.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </>
      ) : null}

      {nearest ? (
        <>
          <div className="section-head">
            <h3>{t('home.nearest')}</h3>
            <Link to="/lugares">{t('home.seeAll')}</Link>
          </div>
          <PlaceCard place={nearest} />
        </>
      ) : waitingPlaces ? (
        <p className="note">{t('home.lookingZone')}</p>
      ) : null}

      <div className="section-head">
        <h3>{t('home.cookHome')}</h3>
        <Link to="/recetas">{t('home.nRecipes', { n: recipes.length })}</Link>
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        {t('home.cookNote')}
      </p>
    </main>
  )
}
