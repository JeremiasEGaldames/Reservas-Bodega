'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// ⭐ SEGURIDAD: TODAS las rutas requieren autenticación excepto /login
const PUBLIC_ROUTES = ['/login']

// Rutas que necesitan rol admin
const ADMIN_ROUTES = ['/admin', '/dashboard']

function AuthGuardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname?.startsWith(route))

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true)

            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error verificando sesión:', error)
                    if (!isPublicRoute) {
                        router.push('/login')
                    }
                    setLoading(false)
                    return
                }

                // 1. Sin sesión y NO es ruta pública → redirigir a login
                if (!session && !isPublicRoute) {
                    const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''))
                    router.push(`/login?returnUrl=${returnUrl}`)
                    setLoading(false)
                    return
                }

                // 2. Con sesión en login → redirigir al dashboard o returnUrl
                if (session && isPublicRoute) {
                    const returnUrl = searchParams?.get('returnUrl')
                    router.push(returnUrl || '/dashboard')
                    setLoading(false)
                    return
                }

                // 3. Con sesión en root → redirigir al dashboard
                if (session && pathname === '/') {
                    router.push('/dashboard')
                    setLoading(false)
                    return
                }

                // 4. Con sesión en ruta admin → verificar rol admin
                if (session && isAdminRoute) {
                    try {
                        const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

                        if (adminError || !isAdmin) {
                            console.warn('AuthGuard: Usuario no es admin, redirigiendo a /unauthorized')
                            router.push('/unauthorized')
                            setLoading(false)
                            return
                        }
                    } catch (err) {
                        console.error('AuthGuard: Error verificando rol admin:', err)
                        router.push('/unauthorized')
                        setLoading(false)
                        return
                    }
                }

                setLoading(false)
            } catch (err) {
                console.error('Error crítico en auth:', err)
                if (!isPublicRoute) {
                    router.push('/login')
                }
                setLoading(false)
            }
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login')
            }
            if (event === 'SIGNED_IN' && pathname === '/login') {
                const returnUrl = searchParams?.get('returnUrl')
                router.push(returnUrl || '/dashboard')
            }
        })

        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, pathname, isPublicRoute, isAdminRoute, searchParams])

    // Mostrar loader siempre que estemos verificando
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        )
    }

    return <>{children}</>
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        }>
            <AuthGuardContent>{children}</AuthGuardContent>
        </Suspense>
    )
}
