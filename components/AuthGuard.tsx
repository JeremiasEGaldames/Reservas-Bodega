'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// Rutas que NO necesitan autenticación (Solo Login)
const PUBLIC_ROUTES = ['/login']

function AuthGuardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            // 1. Not logged in + Protected Route -> Redirect to Login with returnUrl
            if (!session && !isPublicRoute) {
                const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''))
                router.push(`/login?returnUrl=${returnUrl}`)
            }

            // 2. Logged in + Public Route (Login page) -> Redirect to Dashboard or returnUrl
            else if (session && isPublicRoute) {
                const returnUrl = searchParams?.get('returnUrl')
                router.push(returnUrl || '/dashboard')
            }

            // 3. Logged in + Root -> Redirect to Dashboard
            else if (session && pathname === '/') {
                router.push('/dashboard')
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
    }, [router, pathname, isPublicRoute, searchParams])

    // Show loader while checking auth on protected routes
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        )
    }

    // If on login page but loading (checking if already logged in), show loader too to prevent flash
    if (loading && isPublicRoute) {
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
