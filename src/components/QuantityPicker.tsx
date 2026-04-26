'use client'

interface Props {
  value: number
  onChange: (v: number) => void
}

export default function QuantityPicker({ value, onChange }: Props) {
  const set = (n: number) => onChange(Math.max(0, n))

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-3">入庫數量</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set(value - 1)}
          className="w-12 h-12 rounded-full bg-gray-100 text-xl font-bold active:bg-gray-200 flex items-center justify-center">
          −
        </button>
        <span className="flex-1 text-center text-3xl font-bold text-gray-800">{value}</span>
        <button type="button" onClick={() => set(value + 1)}
          className="w-12 h-12 rounded-full bg-gray-100 text-xl font-bold active:bg-gray-200 flex items-center justify-center">
          +
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        {[1, 3, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set(value + n)}
            className="flex-1 py-2 rounded-xl bg-pink-50 text-pink-600 text-sm font-medium active:bg-pink-100"
          >
            +{n}
          </button>
        ))}
      </div>
    </div>
  )
}
