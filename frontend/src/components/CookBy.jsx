import { useI18n } from '../i18n/LanguageContext.jsx'

export default function CookBy({ recipe }) {
  const { t } = useI18n()
  if (!recipe.community) {
    return t('recipes.source', { name: recipe.sourceName })
  }
  const picture = recipe.author?.picture
  const name = recipe.sourceName || recipe.author?.name || ''
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span className="cook-by">
      {picture ? (
        <img
          src={picture}
          alt=""
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
      ) : (
        <span className="cook-by-fallback">{initial}</span>
      )}
      <span className="cook-by-text">
        <em>{t('cook.byCook')}</em>
        <strong>{name}</strong>
      </span>
    </span>
  )
}
