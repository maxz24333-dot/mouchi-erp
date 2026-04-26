'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',          icon: '📥', label: '新增選品' },
  { href: '/inventory', icon: '📦', label: '庫存管理' },
  { href: '/settings',  icon: '⚙️', label: '系統設定' },
]

interface Props {
  onForceMobile: () => void
}

export default function Sidebar({ onForceMobile }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center text-white text-xs font-bold">M</div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">MOUCHI</p>
            <p className="text-xs text-gray-400 leading-tight">進銷存系統</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-pink-50 text-pink-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
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
