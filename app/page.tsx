'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Wine } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch (error) {
        // Fallback en caso de error
        router.replace('/login')
      }
    }
    checkSession()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-wine-50">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-6 rounded-full shadow-xl">
          <Wine className="w-16 h-16 text-wine-700" />
        </div>
        <div className="flex items-center gap-3 text-wine-800">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium tracking-wide">Iniciando Sistema...</span>
        </div>
      </div>
    </div>
  )
}
