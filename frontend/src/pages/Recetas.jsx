import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RecipePhoto from '../components/RecipePhoto.jsx'
import { recipeTags, recipes } from '../data/recipes.js'

export default function Recetas() {
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
        <h2 className="page-title">Cociná sin TACC</h2>
        <p>
          Recetas publicadas de varias fuentes, con el paso a paso y un lugar cerca para cada
          ingrediente. Hay una distinta cada día. Confirmá siempre el sello sin TACC en el paquete.
        </p>
      </section>
      <input
        className="search"
        placeholder="Buscar receta o ingrediente…"
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
            {item}
          </button>
        ))}
      </div>
      <div className="grid-cards">
        {list.map((recipe) => (
          <Link key={recipe.id} className="card recipe-card" to={`/recetas/${recipe.id}`}>
            <RecipePhoto recipe={recipe} />
            <h4>{recipe.title}</h4>
            <p>{recipe.summary}</p>
            <div className="tags">
              {recipe.tags.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <div className="row-stats" style={{ marginTop: 10 }}>
              <span>{recipe.minutes} min</span>
              <span>{recipe.servings} porciones</span>
              <span>{recipe.difficulty}</span>
            </div>
            <p className="meta" style={{ marginTop: 8 }}>
              Fuente: {recipe.sourceName}
            </p>
          </Link>
        ))}
      </div>
      {list.length === 0 ? <p className="note">No hay recetas con esa búsqueda. Probá otra palabra o filtro.</p> : null}
    </main>
  )
}
