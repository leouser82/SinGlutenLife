import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { recipes as editorial } from '../data/recipes.js'
import { fetchCommunityRecipes, publishCommunityRecipe, deleteCommunityRecipe } from './store.js'

const CommunityContext = createContext({
  community: [],
  allRecipes: editorial,
  publish: async () => null,
  remove: async () => false,
})

export function CommunityProvider({ children }) {
  const [community, setCommunity] = useState([])

  const refresh = useCallback(async () => {
    try {
      const list = await fetchCommunityRecipes()
      setCommunity(list)
    } catch {
      setCommunity([])
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const publish = useCallback(async (recipe) => {
    const saved = await publishCommunityRecipe(recipe)
    if (!saved?.id) throw new Error('publish')
    setCommunity((current) => {
      const rest = current.filter((item) => item.id !== saved.id)
      return [saved, ...rest]
    })
    return saved
  }, [])

  const remove = useCallback(async (recipe, author) => {
    if (!recipe?.id) return false
    await deleteCommunityRecipe(recipe.id, author)
    setCommunity((current) => current.filter((item) => item.id !== recipe.id))
    return true
  }, [])

  const allRecipes = useMemo(() => [...community, ...editorial], [community])

  const value = useMemo(
    () => ({ community, allRecipes, publish, remove, refresh }),
    [community, allRecipes, publish, remove, refresh],
  )

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  return useContext(CommunityContext)
}
