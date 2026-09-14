import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'

export default function RecipePhoto({ recipe, className = 'recipe-photo' }) {
  const { t } = useI18n()
  const [ok, setOk] = useState(Boolean(recipe.image))
  if (!ok || !recipe.image) return null
  return (
    <figure className={className}>
      <img src={recipe.image} alt="" onError={() => setOk(false)} />
      <figcaption>{t('recipe.photo', { name: recipe.sourceName })}</figcaption>
    </figure>
  )
}
