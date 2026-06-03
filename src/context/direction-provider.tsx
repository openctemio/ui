'use client'

import { createContext, useContext, useMemo } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'

export type Direction = 'ltr' | 'rtl'

type DirectionContextValue = {
  dir: Direction
}

const DirectionContext = createContext<DirectionContextValue | null>(null)

export function DirectionProvider({
  dir,
  children,
}: {
  dir: Direction
  children: React.ReactNode
}) {
  const value = useMemo(() => ({ dir }), [dir])

  return (
    <DirectionContext.Provider value={value}>
      <RdxDirProvider dir={dir}>{children}</RdxDirProvider>
    </DirectionContext.Provider>
  )
}

export function useDirection() {
  const ctx = useContext(DirectionContext)
  if (!ctx) throw new Error('useDirection must be used within a DirectionProvider')
  return ctx
}
