import { createContext, useContext } from 'react'
import type { RootStore } from './RootStore'

export const StoreContext = createContext<RootStore | null>(null)

/**
 * Hook para acceder al store raíz desde cualquier componente.
 *
 * Falla de forma explícita si se usa fuera de `<StoreContext.Provider>`,
 * en lugar de devolver un store por defecto que oculte el error.
 */
export const useStore = (): RootStore => {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useStore debe usarse dentro de <StoreContext.Provider>')
  }
  return store
}
