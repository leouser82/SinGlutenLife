import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { recipeTags, recipes } from '../data/recipes.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import T from '../i18n/T.jsx'

export default function Recetas() {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('Todas')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return recipes.filter((recipe) => {
      const hay = `${recipe.title} ${recipe.summary} ${recipe.tags.join(' ')}`.toLowerCase()
      const matchText = !needle || hay.includes(needle)
      const matchTag = tag === 'Todas' || recipe.tags.includes(tag)
      return matchText && matchTag
    })
  }, [q, tag])

  return (
    <main className="page recipes-page">
      <section className="recipes-head">
        <h2 className="page-title">{t('recipes.title')}</h2>
        <p>{t('recipes.lead')}</p>
      </section>
      <input
        className="search"
        placeholder={t('recipes.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="filters">
        {recipeTags.map((item) => (
          <button
            key={item}
            type="button"
            className={tag === item ? 'filter active' : 'filter'}
            onClick={() => setTag(item)}
          >
            {labelOf(t, 'tag', item)}
          </button>
        ))}
      </div>
      <div className="grid-cards">
        {list.map((recipe) => (
          <Link key={recipe.id} className="card recipe-card" to={`/recetas/${recipe.id}`}>
            <RecipePhoto recipe={recipe} />
            <T as="h4" text={recipe.title} />
            <T as="p" text={recipe.summary} />
            <div className="tags">
              {recipe.tags.map((item) => (
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
              {t('recipes.source', { name: recipe.sourceName })}
            </p>
          </Link>
        ))}
      </div>
      {list.length === 0 ? <p className="note">{t('recipes.empty')}</p> : null}
    </main>
  )
}
