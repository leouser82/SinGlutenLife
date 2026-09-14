import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChipRow from '../components/ChipRow.jsx'
import Pager from '../components/Pager.jsx'
import RecipeCard from '../components/RecipeCard.jsx'
import { useCommunity } from '../community/CommunityContext.jsx'
import { recipeTags } from '../data/recipes.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'

const PAGE_SIZE = 8

export default function Recetas() {
  const { t } = useI18n()
  const { allRecipes } = useCommunity()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('Todas')
  const [page, setPage] = useState(1)
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

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [q, tag])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  function goPage(next) {
    setPage(next)
    document.querySelector('.recipes-page .grid-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
      <ChipRow>
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
      </ChipRow>
      <div className="grid-cards">
        {visible.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      <Pager page={page} pages={pages} onPage={goPage} />
      {list.length === 0 ? <p className="note">{t('recipes.empty')}</p> : null}
    </main>
  )
}
