'use client'
import type { SourceRow } from '@/types'

interface Props {
  sources: SourceRow[]
  selectedId: string
  onSelect: (source: SourceRow) => void
}

export default function SourceSelector({ sources, selectedId, onSelect }: Props) {
  if (sources.length === 0) {
    return <div className="text-xs text-gray-400 py-2">載入來源中…</div>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
            ${selectedId === s.id
              ? 'bg-pink-400 text-white shadow-md scale-105'
              : 'bg-white text-gray-600 shadow-sm active:scale-95'
            }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
