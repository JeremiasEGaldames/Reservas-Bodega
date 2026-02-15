'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// Rutas que NO necesitan autenticación
const PUBLIC_ROUTES = ['/login', '/reservas']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [loading, setLoading] = useState(true)

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            if (!session && !isPublicRoute) {
                // Sin sesión + ruta protegida (incluye /) -> Login
                router.push('/login')
            } else if (session && (pathname === '/login' || pathname === '/')) {
                // Con sesión + en login o raíz -> Admin
                router.push('/admin')
            }

            setLoading(false)
        }

        checkAuth()

        // Escuchar cambios de autenticación (logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login')
            }
            if (event === 'SIGNED_IN') {
                router.push('/admin')
            }
        })

        return () => subscription.unsubscribe()
    }, [router, pathname, isPublicRoute])

    // Mostrar loader en rutas protegidas mientras se chequea
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        )
    }

    return <>{children}</>
}
