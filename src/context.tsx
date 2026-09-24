import { createContext, useContext, type ReactNode } from 'react'
import { useAppStore, type Store } from './store'

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStore()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('store missing')
  return v
}
