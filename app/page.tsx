export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Wine, CalendarCheck, Settings } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-br from-wine-50 via-white to-wine-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-12">

        <header className="flex flex-col items-center gap-4 text-center animate-fade-in-down">
          <div className="bg-wine-100 p-4 rounded-full shadow-lg mb-2">
            <Wine className="w-12 h-12 text-wine-700" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-wine-900 tracking-tight">
            Bodega Reservas
          </h1>
          <p className="text-xl text-wine-700 max-w-2xl font-sans">
            Gestión integral de visitas guiadas y experiencias exclusivas.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">

          {/* Admin Panel Card */}
          <Link
            href="/admin"
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-wine-200 bg-white/80 p-12 text-center transition-all hover:bg-white hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm"
          >
            <div className="p-4 rounded-full bg-wine-50 text-wine-600 group-hover:bg-wine-600 group-hover:text-white transition-colors duration-300">
              <Settings className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-wine-800">Panel de Administración</h2>
              <p className="text-wine-600/80">
                Gestione disponibilidad, cupos y listado de visitas en tiempo real.
              </p>
            </div>
            <span className="absolute bottom-6 text-sm font-semibold text-wine-500 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              Acceder al Panel →
            </span>
          </Link>

          {/* New Reservation Card */}
          <Link
            href="/reservas"
            className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-wine-200 bg-white/80 p-12 text-center transition-all hover:bg-white hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm"
          >
            <div className="p-4 rounded-full bg-wine-50 text-wine-600 group-hover:bg-wine-600 group-hover:text-white transition-colors duration-300">
              <CalendarCheck className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-wine-800">Nueva Reserva</h2>
              <p className="text-wine-600/80">
                Formulario público para agendar visitas guiadas.
              </p>
            </div>
            <span className="absolute bottom-6 text-sm font-semibold text-wine-500 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              Realizar Reserva →
            </span>
          </Link>

        </div>
      </div>

      <footer className="fixed bottom-0 w-full text-center p-4 text-wine-400 text-sm bg-gradient-to-t from-white/80 to-transparent">
        HankStudio2026® - All Rigths Reserved
      </footer>
    </main>
  )
}
