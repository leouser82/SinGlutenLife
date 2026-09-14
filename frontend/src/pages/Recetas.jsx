import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { useCommunity } from '../community/CommunityContext.jsx'
import { recipeTags } from '../data/recipes.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import T from '../i18n/T.jsx'

export default function Recetas() {
  const { t } = useI18n()
  const { allRecipes } = useCommunity()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('Todas')
  const filters = useMemo(() => [...recipeTags, 'Comunidad'], [])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return allRecipes.filter((recipe) => {
      const hay = `${recipe.title} ${recipe.summary} ${(recipe.tags || []).join(' ')} ${recipe.sourceName || ''}`.toLowerCase()
      const matchText = !needle || hay.includes(needle)
      const matchTag =
        tag === 'Todas' || (tag === 'Comunidad' ? recipe.community : (recipe.tags || []).includes(tag))
      return matchText && matchTag
    })
  }, [allRecipes, q, tag])

  return (
    <main className="page recipes-page">
      <section className="recipes-head">
        <h2 className="page-title">{t('recipes.title')}</h2>
        <p>{t('recipes.lead')}</p>
      </section>
      <Link className="cook-banner" to="/recetas/nueva">
        <span className="cook-kicker">{t('cook.bannerKicker')}</span>
        <strong>{t('cook.bannerTitle')}</strong>
        <p>{t('cook.bannerBody')}</p>
        <span className="cook-banner-cta">{t('cook.cta')}</span>
      </Link>
      <input
        className="search"
        placeholder={t('recipes.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="filters">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={tag === item ? 'filter active' : 'filter'}
            onClick={() => setTag(item)}
          >
            {item === 'Comunidad' ? t('cook.filter') : labelOf(t, 'tag', item)}
          </button>
        ))}
      </div>
      <div className="grid-cards">
        {list.map((recipe) => (
          <Link
            key={recipe.id}
            className={`card recipe-card${recipe.community ? ' from-cook' : ''}`}
            to={`/recetas/${recipe.id}`}
          >
            <RecipePhoto recipe={recipe} />
            {recipe.community ? <span className="cook-ribbon">{t('cook.community')}</span> : null}
            {recipe.community ? <h4>{recipe.title}</h4> : <T as="h4" text={recipe.title} />}
            {recipe.community ? <p>{recipe.summary}</p> : <T as="p" text={recipe.summary} />}
            <div className="tags">
              {(recipe.tags || []).map((item) => (
                <span className="tag" key={item}>
                  {labelOf(t, 'tag', item)}
                </span>
              ))}
            </div>
            <div className="row-stats" style={{ marginTop: 10 }}>
              <span>{t('home.min', { n: recipe.minutes })}</span>
              <span>{t('home.servings', { n: recipe.servings })}</span>
              <span>{labelOf(t, 'diff', recipe.difficulty)}</span>
            </div>
            <p className="meta" style={{ marginTop: 8 }}>
              {recipe.community ? `${t('cook.byCook')} ${recipe.sourceName}` : t('recipes.source', { name: recipe.sourceName })}
            </p>
          </Link>
        ))}
      </div>
      {list.length === 0 ? <p className="note">{t('recipes.empty')}</p> : null}
    </main>
  )
}
