'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Brand = 'mouchi' | 'wholesale'

interface BrandCtx {
  brand: Brand
  setBrand: (b: Brand) => void
  isWholesale: boolean
}

const Ctx = createContext<BrandCtx>({ brand: 'mouchi', setBrand: () => {}, isWholesale: false })

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>('mouchi')

  useEffect(() => {
    const stored = localStorage.getItem('mouchi_brand')
    if (stored === 'wholesale') setBrandState('wholesale')
  }, [])

  function setBrand(b: Brand) {
    setBrandState(b)
    localStorage.setItem('mouchi_brand', b)
  }

  return (
    <Ctx.Provider value={{ brand, setBrand, isWholesale: brand === 'wholesale' }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBrand() { return useContext(Ctx) }
