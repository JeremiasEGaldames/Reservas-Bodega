'use client'

import Link from 'next/link'
import { CalendarDays, Settings, LogOut, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gray-50 font-poppins flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Panel Principal</h1>
                    <p className="text-gray-500">Selecciona una opción para continuar</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Tarjeta de Reservas */}
                    <Link
                        href="/reservas"
                        className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <CalendarDays size={120} className="text-wine-600" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="w-14 h-14 bg-wine-50 text-wine-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-wine-600 group-hover:text-white transition-colors duration-300">
                                <CalendarDays size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-wine-700 transition-colors">Nueva Reserva</h2>
                                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                                    Cargar una nueva visita para un cliente. Accede al formulario de alta de reservas.
                                </p>
                            </div>
                            <div className="pt-4 flex items-center text-wine-600 font-semibold text-sm group-hover:gap-2 transition-all">
                                Ir al formulario <ArrowRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </Link>

                    {/* Tarjeta de Administración */}
                    <Link
                        href="/admin"
                        className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Settings size={120} className="text-gray-900" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="w-14 h-14 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-900 group-hover:text-white transition-colors duration-300">
                                <Settings size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">Administración</h2>
                                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                                    Gestionar horarios, ver listado de visitas, analíticas y configuración del sistema.
                                </p>
                            </div>
                            <div className="pt-4 flex items-center text-gray-700 font-semibold text-sm group-hover:gap-2 transition-all">
                                Ir al panel <ArrowRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="text-center pt-8">
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto text-sm font-medium transition-colors mb-8"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                    <p className="text-xs text-gray-300">Bodega Reservas v1.0 • Sistema Interno</p>
                </div>

            </div>
        </div>
    )
}
