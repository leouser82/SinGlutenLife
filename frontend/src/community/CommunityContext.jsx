import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { recipes as editorial } from '../data/recipes.js'
import { fetchCommunityRecipes, publishCommunityRecipe } from './store.js'

const CommunityContext = createContext({
  community: [],
  allRecipes: editorial,
  publish: async () => null,
})

export function CommunityProvider({ children }) {
  const [community, setCommunity] = useState([])

  const refresh = useCallback(async () => {
    const list = await fetchCommunityRecipes()
    setCommunity(list)
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

  const allRecipes = useMemo(() => [...community, ...editorial], [community])

  const value = useMemo(() => ({ community, allRecipes, publish, refresh }), [community, allRecipes, publish, refresh])

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  return useContext(CommunityContext)
}
