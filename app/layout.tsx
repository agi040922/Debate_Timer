import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Debate Timer',
  description: '다양한 토론 형식의 타이머입니다.',
  generator: 'Made with ❤️ by Kyunghoon',
  icons: {
    icon: '/favicon.ico', // public에 저장된 경우
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
