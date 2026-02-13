import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'Dance Music Mastering AI | ダンスミュージック特化AIマスタリング',
  description: 'AIが楽曲を解析し、配信基準に自動最適化。プロデューサーもDJも。1曲無料。プロ品質のマスタリングを今すぐ体験。',
}

export const viewport: Viewport = {
  themeColor: '#0a0f14',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
