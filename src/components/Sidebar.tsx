'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBrand } from '@/lib/brand'

const NAV = [
  { href: '/',          icon: '📥', label: '新增選品' },
  { href: '/inventory', icon: '📦', label: '庫存管理' },
  { href: '/reports',   icon: '📊', label: '進銷存報表' },
  { href: '/logs',      icon: '📋', label: '庫存異動日誌' },
  { href: '/customers', icon: '👤', label: '客戶管理' },
  { href: '/suppliers', icon: '🏭', label: '供應商管理' },
  { href: '/settings',  icon: '⚙️', label: '系統設定' },
]

interface Props {
  onForceMobile: () => void
}

export default function Sidebar({ onForceMobile }: Props) {
  const pathname = usePathname()
  const { brand, setBrand } = useBrand()

  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Brand logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${brand === 'wholesale' ? 'bg-indigo-500' : 'bg-pink-500'}`}>
            {brand === 'wholesale' ? 'W' : 'M'}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">
              {brand === 'wholesale' ? '批發倉' : 'MOUCHI'}
            </p>
            <p className="text-xs text-gray-400 leading-tight">進銷存系統</p>
          </div>
        </div>
        {/* Brand switcher */}
        <div className="flex gap-1">
          <button
            onClick={() => setBrand('mouchi')}
            className={`flex-1 text-xs py-1 rounded-lg font-medium transition-all ${brand === 'mouchi' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            MOUCHI零售
          </button>
          <button
            onClick={() => setBrand('wholesale')}
            className={`flex-1 text-xs py-1 rounded-lg font-medium transition-all ${brand === 'wholesale' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            批發倉
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href
          const activeColor = brand === 'wholesale' ? 'bg-indigo-50 text-indigo-600' : 'bg-pink-50 text-pink-600'
          const dotColor   = brand === 'wholesale' ? 'bg-indigo-400' : 'bg-pink-400'
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active ? activeColor : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {active && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${dotColor}`} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <button
          onClick={onForceMobile}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all"
        >
          <span>📱</span>
          切換行動版
        </button>
      </div>
    </aside>
  )
}
