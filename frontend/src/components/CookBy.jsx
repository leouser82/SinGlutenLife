import { useI18n } from '../i18n/LanguageContext.jsx'

export default function CookBy({ recipe }) {
  const { t } = useI18n()
  if (!recipe.community) {
    return t('recipes.source', { name: recipe.sourceName })
  }
  const picture = recipe.author?.picture
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
      ) : null}
      {t('cook.byCook')} {recipe.sourceName}
    </span>
  )
}
