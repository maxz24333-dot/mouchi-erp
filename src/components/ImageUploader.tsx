'use client'
import { useRef, useState } from 'react'

interface Props {
  onImage: (file: File, previewUrl: string) => void
  previewUrl: string | null
  loading?: boolean
  compact?: boolean
}

export default function ImageUploader({ onImage, previewUrl, loading, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    onImage(file, url)
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border-2 border-dashed transition-all
        ${dragging ? 'border-pink-400 bg-pink-50' : 'border-gray-300 bg-white'}
        ${previewUrl ? 'border-none' : 'aspect-[4/3]'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt="商品預覽" className={`w-full object-cover ${compact ? 'max-h-44' : 'max-h-64'}`} />
          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-white text-sm font-medium flex items-center gap-2">
                <span className="animate-spin">⏳</span> AI 辨識中...
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute top-2 right-2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full active:bg-black/70"
          >
            更換
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full h-full flex flex-col items-center justify-center gap-2 ${compact ? 'py-6' : 'py-10'} active:bg-gray-50`}
        >
          <span className={compact ? 'text-3xl' : 'text-5xl'}>📷</span>
          <span className="text-gray-600 text-sm font-medium">點擊上傳商品圖片</span>
          <span className="text-gray-400 text-xs">支援拍照或選取相簿</span>
        </button>
      )}

      {/* No capture attribute — lets browser decide (file picker on desktop, camera on mobile) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
