'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react'

export default function UnauthorizedPage() {
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-10 md:p-14 rounded-3xl shadow-2xl max-w-lg w-full text-center space-y-8 border border-gray-100">
                {/* Icon */}
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>

                {/* Message */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Acceso Denegado
                    </h1>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        No tienes permisos de administrador para acceder a esta sección.
                        Si crees que esto es un error, intenta cerrar sesión y volver a ingresar.
                    </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100"></div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/reservas"
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                        <Home size={18} />
                        Ir a Reservas
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 bg-wine-900 text-white py-3 px-6 rounded-xl font-semibold hover:bg-wine-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>

                {/* Footer note */}
                <p className="text-xs text-gray-400">
                    Si necesitas acceso administrativo, solicítalo al equipo de gestión.
                </p>
            </div>
        </div>
    )
}
