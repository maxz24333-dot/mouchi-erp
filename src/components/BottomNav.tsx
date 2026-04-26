'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',          label: '入庫',  icon: '📥' },
  { href: '/inventory', label: '庫存',  icon: '📦' },
  { href: '/settings',  label: '設定',  icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 flex z-20">
      {TABS.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all
              ${active ? 'text-pink-500' : 'text-gray-400'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
            {active && <span className="w-1 h-1 rounded-full bg-pink-400 mt-0.5" />}
          </Link>
        )
      })}
    </nav>
  )
}
