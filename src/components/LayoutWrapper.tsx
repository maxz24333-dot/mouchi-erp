'use client'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { BrandProvider, useBrand } from '@/lib/brand'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <LayoutInner>{children}</LayoutInner>
    </BrandProvider>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [layout, setLayout] = useState<'mobile' | 'desktop' | null>(null)
  const { brand, setBrand } = useBrand()

  useEffect(() => {
    const pref = localStorage.getItem('mouchi_view')
    const isLarge = window.innerWidth >= 1024
    if (pref === 'mobile') setLayout('mobile')
    else if (pref === 'desktop' || isLarge) setLayout('desktop')
    else setLayout('mobile')
  }, [])

  function switchTo(mode: 'mobile' | 'desktop') {
    setLayout(mode)
    localStorage.setItem('mouchi_view', mode)
  }

  if (layout === null) {
    return (
      <div className="min-h-screen max-w-lg mx-auto pb-16">
        {children}
        <BottomNav />
      </div>
    )
  }

  if (layout === 'mobile') {
    return (
      <div className="min-h-screen max-w-lg mx-auto pb-16 relative">
        {/* Brand switcher bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-gray-100">
          <button
            onClick={() => setBrand('mouchi')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${brand === 'mouchi' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            MOUCHI零售
          </button>
          <button
            onClick={() => setBrand('wholesale')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${brand === 'wholesale' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            批發倉
          </button>
        </div>
        {children}
        <BottomNav />
        <button
          onClick={() => switchTo('desktop')}
          className="fixed top-3 right-3 z-50 text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-full shadow-sm hover:bg-gray-50"
        >
          🖥 電腦版
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onForceMobile={() => switchTo('mobile')} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
