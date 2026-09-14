import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard.jsx'
import { useCommunity } from '../community/CommunityContext.jsx'
import { recipeTags } from '../data/recipes.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'

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
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      {list.length === 0 ? <p className="note">{t('recipes.empty')}</p> : null}
    </main>
  )
}
