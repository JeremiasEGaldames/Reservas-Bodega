'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Admin Panel Error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
                <p className="text-gray-500 mb-6 text-sm">
                    {error.message || 'Ha ocurrido un error inesperado en el panel de administración.'}
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full py-3 bg-wine-600 text-white rounded-xl font-bold hover:bg-wine-700 transition"
                    >
                        Intentar nuevamente
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    )
}
