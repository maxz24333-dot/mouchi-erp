import type { Metadata, Viewport } from 'next'
import './globals.css'
import LayoutWrapper from '@/components/LayoutWrapper'

export const metadata: Metadata = {
  title: 'MOUCHI 進銷存',
  description: 'MOUCHI 選物店 採購入庫系統',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
