import { Link } from 'react-router-dom'
import RecipePhoto from './RecipePhoto.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import T from '../i18n/T.jsx'

export default function RecipeCard({ recipe }) {
  const { t } = useI18n()
  return (
    <article className={`recipe-card-item${recipe.community ? ' is-community' : ''}`}>
      <Link
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
    </article>
  )
}
