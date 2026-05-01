import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { PoweredByMarquee } from '@/components/brand-wordmark'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'BigCat Marketplace',
  description: 'Your modern marketplace platform',
  generator: 'v0.app',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen overflow-y-auto w-full overflow-x-hidden">
        <div className="min-h-screen w-full max-w-full overflow-x-hidden">
          <div className="border-b border-border bg-card px-4 py-2">
            <PoweredByMarquee />
          </div>
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}
