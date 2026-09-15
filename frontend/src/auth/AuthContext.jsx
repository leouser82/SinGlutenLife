import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { clearCook, loginWithGoogle, localCook, readCook, saveCook } from './providers.js'

const AuthContext = createContext({
  user: null,
  loginGoogle: async () => null,
  signLocal: () => null,
  logout: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCook())

  const loginGoogle = useCallback(async () => {
    const cook = await loginWithGoogle()
    if (!cook) return null
    setUser(saveCook(cook))
    return cook
  }, [])

  const signLocal = useCallback((name, provider) => {
    const cook = localCook(name, provider)
    setUser(cook)
    return cook
  }, [])

  const logout = useCallback(() => {
    clearCook()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loginGoogle, signLocal, logout }),
    [user, loginGoogle, signLocal, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
