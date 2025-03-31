import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'Debate Timer',
  description: '다양한 토론 형식의 타이머입니다.',
  generator: 'Made with ❤️ by Kyunghoon',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />  {/* ✅ 여기가 핵심! */}
      </body>
    </html>
  )
}
