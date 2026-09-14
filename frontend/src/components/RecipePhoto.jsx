import { useState } from 'react'

export default function RecipePhoto({ recipe, className = 'recipe-photo' }) {
  const [ok, setOk] = useState(Boolean(recipe.image))
  if (!ok || !recipe.image) return null
  return (
    <figure className={className}>
      <img src={recipe.image} alt="" onError={() => setOk(false)} />
      <figcaption>Foto de {recipe.sourceName}</figcaption>
    </figure>
  )
}
