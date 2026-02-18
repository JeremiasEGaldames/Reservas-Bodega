'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// Rutas que NO necesitan autenticación (públicas)
const PUBLIC_ROUTES = ['/login', '/reservas']

// Rutas que necesitan rol admin
const ADMIN_ROUTES = ['/admin', '/dashboard']

function AuthGuardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
    // Check if current route needs admin access
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname?.startsWith(route))

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            // 1. Not logged in + Admin Route -> Redirect to Login with returnUrl
            if (!session && isAdminRoute) {
                const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''))
                router.push(`/login?returnUrl=${returnUrl}`)
                setLoading(false)
                return
            }

            // 2. Not logged in + Public Route -> Allow access (reservas page, etc.)
            if (!session && isPublicRoute) {
                setLoading(false)
                return
            }

            // 3. Not logged in + any other protected route -> Redirect to Login
            if (!session && !isPublicRoute) {
                const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''))
                router.push(`/login?returnUrl=${returnUrl}`)
                setLoading(false)
                return
            }

            // 4. Logged in + Admin Route -> Verify admin role
            if (session && isAdminRoute) {
                try {
                    const { data: isAdmin, error } = await supabase.rpc('is_admin')

                    if (error || !isAdmin) {
                        console.warn('AuthGuard: User is not admin, redirecting to /unauthorized')
                        router.push('/unauthorized')
                        setLoading(false)
                        return
                    }
                } catch (err) {
                    console.error('AuthGuard: Error checking admin role:', err)
                    router.push('/unauthorized')
                    setLoading(false)
                    return
                }
            }

            // 5. Logged in + Login page -> Redirect to Dashboard or returnUrl
            if (session && pathname === '/login') {
                const returnUrl = searchParams?.get('returnUrl')
                router.push(returnUrl || '/dashboard')
                setLoading(false)
                return
            }

            // 6. Logged in + Root -> Redirect to Dashboard
            if (session && pathname === '/') {
                router.push('/dashboard')
                setLoading(false)
                return
            }

            setLoading(false)
        }

        checkAuth()

        // Listen for auth state changes
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
    }, [router, pathname, isPublicRoute, isAdminRoute, searchParams])

    // Show loader while checking auth on admin/protected routes
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        )
    }

    // If on login page but loading (checking if already logged in), show loader too
    if (loading && pathname === '/login') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <Loader2 className="animate-spin text-white" size={40} />
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
