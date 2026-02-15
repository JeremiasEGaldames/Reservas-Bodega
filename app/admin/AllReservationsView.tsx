'use client'

import { useState, useEffect } from 'react'
import { supabase, Visita } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { Search, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function Badge({ type, size = 'sm' }: { type: string, size?: 'sm' | 'lg' }) {
    const isEs = type === 'Español' || type === 'Spanish'
    return (
        <span className={cn(
            "font-bold rounded-md flex items-center gap-1.5 shadow-sm border",
            size === 'sm' ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
            isEs ? "bg-yellow-50 text-yellow-700 border-yellow-100" : "bg-blue-50 text-blue-700 border-blue-100"
        )}>
            <div className={cn("rounded-full", size === 'sm' ? "w-1.5 h-1.5" : "w-2 h-2", isEs ? "bg-yellow-500" : "bg-blue-500")} />
            {isEs ? 'ES' : 'EN'}
        </span>
    )
}

export default function AllReservationsView({ handleDeleteReserva }: { handleDeleteReserva: (id: number) => void }) {
    const [reservas, setReservas] = useState<Visita[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchAllReservas()
    }, [])

    const fetchAllReservas = async () => {
        setLoading(true)
        // Simple fetch all for now, assuming not massive data yet. 
        // For production with thousands of rows, pagination should be server-side.
        const { data, error } = await supabase
            .from('visitas')
            .select('*')
            .order('fecha', { ascending: false })
            .order('hora', { ascending: true })

        if (data) setReservas(data)
        setLoading(false)
    }

    const filtered = reservas.filter(r =>
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        r.apellido.toLowerCase().includes(search.toLowerCase()) ||
        r.numero_habitacion.includes(search) ||
        r.hotel.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 pb-10">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[80vh]">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Listado Maestro de Reservas</h2>
                        <p className="text-sm text-gray-500">Total histórico: {reservas.length} reservas</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <div className="flex gap-2 w-full md:w-96">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-wine-500 outline-none transition shadow-sm"
                            />
                            <button
                                onClick={fetchAllReservas}
                                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-wine-600 transition shadow-sm"
                                title="Actualizar lista"
                            >
                                <Loader2 size={20} className={cn("transition-all", loading ? "animate-spin" : "")} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-wine-600" size={40} />
                        </div>
                    ) : (
                        <div className="min-w-[800px]">
                            <table className="w-full">
                                <thead className="bg-gray-100 sticky top-0 z-10 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Fecha</th>
                                        <th className="px-6 py-4 text-left">Huésped</th>
                                        <th className="px-6 py-4 text-left">Hotel / Hab</th>
                                        <th className="px-6 py-4 text-left">Turno</th>
                                        <th className="px-6 py-4 text-left">Comentarios</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filtered.map((v) => (
                                        <tr key={v.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                {format(parseISO(v.fecha), "dd/MM/yyyy")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{v.apellido}, {v.nombre}</div>
                                                {/* ID removed from display visually, but available in v.id if needed for actions */}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-wine-900">{v.hotel}</div>
                                                <div className="text-xs text-gray-500">Hab: {v.numero_habitacion}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">{v.hora.slice(0, 5)}</span>
                                                    <Badge type={v.idioma} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate text-sm text-gray-500 text-wrap">
                                                {v.comentarios || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        handleDeleteReserva(v.id)
                                                        // Optimistically remove from UI or refetch
                                                        setReservas(prev => prev.filter(r => r.id !== v.id))
                                                    }}
                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                    title="Eliminar reserva"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                                No se encontraron reservas coincidenes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
