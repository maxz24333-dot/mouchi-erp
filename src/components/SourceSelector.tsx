'use client'
import type { Source, JapanSupplier } from '@/types'

const MAIN_SOURCES = [
  { value: 'thailand' as Source, label: '泰國', flag: '🇹🇭' },
  { value: 'japan' as const,     label: '日本', flag: '🇯🇵' },
  { value: 'korea' as Source,    label: '韓國', flag: '🇰🇷' },
  { value: 'other' as Source,    label: '其他', flag: '📦' },
]

const JAPAN_SUPPLIERS: { value: JapanSupplier; label: string }[] = [
  { value: 'haido', label: '海度' },
  { value: 'mdm',   label: 'MDM' },
  { value: 'sd',    label: 'SD' },
  { value: 'other', label: '其他' },
]

interface Props {
  source: Source
  isJapanActive: boolean
  japanSupplier: JapanSupplier
  onChange: (source: Source, isJapanActive: boolean, japanSupplier: JapanSupplier) => void
}

export default function SourceSelector({ source, isJapanActive, japanSupplier, onChange }: Props) {
  const activeMain = isJapanActive ? 'japan' : source

  function handleMain(v: Source | 'japan') {
    if (v === 'japan') {
      onChange(japanSupplier, true, japanSupplier)
    } else {
      onChange(v as Source, false, japanSupplier)
    }
  }

  function handleJapanSupplier(s: JapanSupplier) {
    onChange(s, true, s)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {MAIN_SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => handleMain(s.value)}
            className={`flex flex-col items-center justify-center py-3 rounded-xl text-xs font-medium transition-all
              ${activeMain === s.value
                ? 'bg-pink-400 text-white shadow-md scale-105'
                : 'bg-white text-gray-600 shadow-sm active:scale-95'
              }`}
          >
            <span className="text-xl mb-0.5">{s.flag}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {isJapanActive && (
        <div className="flex gap-2">
          {JAPAN_SUPPLIERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleJapanSupplier(s.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                ${japanSupplier === s.value
                  ? 'bg-pink-400 text-white'
                  : 'bg-white text-gray-600 shadow-sm'
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
