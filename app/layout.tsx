import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import AuthGuard from '@/components/AuthGuard'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: 'Bodega Reservas',
  description: 'Sistema de gestión de visitas guiadas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} ${poppins.variable}`} suppressHydrationWarning>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
