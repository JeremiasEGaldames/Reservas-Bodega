'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { supabase, Disponibilidad } from '@/lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Calendar as CalendarIcon,
    MapPin,
    User,
    Globe,
    Building,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Phone,
    Mail,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'


function ReservasContent() {
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [fechas, setFechas] = useState<Disponibilidad[]>([])
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<Disponibilidad | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        hotel: '',
        habitacion: '',
        contacto: '', // New field for Externo
        idioma: 'Español', // Default
        comentarios: '' // New field
    })

    useEffect(() => {
        fetchFechas()

        // Realtime Subscription
        // Realtime Subscription with specific DELETE handler
        const channel = supabase.channel('realtime_reservas')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'disponibilidad' }, () => {
                console.log('Realtime: INSERT detectado')
                fetchFechas(true)
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'disponibilidad' }, () => {
                console.log('Realtime: UPDATE detectado')
                fetchFechas(true)
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'disponibilidad' }, (payload) => {
                console.log('Realtime: DELETE detectado', payload)
                // Forzamos actualización inmediata
                fetchFechas(true)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchFechas = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) setLoading(true)
        else setIsRefreshing(true)

        try {
            let data: Disponibilidad[] = []

            // Auto-generar fechas si faltan (Server-side logic via RPC or manual check)
            const { error: rpcError } = await supabase.rpc('ensure_future_availability', { days_ahead: 60 })
            if (rpcError) console.warn("RPC ensure_future_availability failed or missing", rpcError)

            const today = new Date().toISOString().split('T')[0]
            const { data: result, error } = await supabase
                .from('disponibilidad')
                .select('*')
                .eq('habilitado', true)
                .gte('fecha', today)
                // .gt('cupos_disponibles', 0) // REMOVED: Fetch all to show "Agotado" state
                .order('fecha', { ascending: true })

            if (error) throw error
            data = result || []
            setFechas(data)

            // Si el slot seleccionado se actualizó (ej: cups bajaron a 0), actualizarlo
            if (selectedSlot) {
                const updatedSlot = data.find(s => s.id === selectedSlot.id)
                if (updatedSlot) setSelectedSlot(updatedSlot)
            }

        } catch (err) {
            console.error('Error cargando fechas', err)
            if (!isBackgroundRefresh) setError('No se pudieron cargar las fechas disponibles.')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSlot) {
            setError("Por favor seleccione una fecha y horario.")
            return
        }

        if (selectedSlot.cupos_disponibles <= 0) {
            setError("Lo sentimos, no hay cupos disponibles momentáneamente para este horario.")
            return
        }

        setSubmitting(true)
        setError('')

        try {
            // 1. Insertar Reserva
            const { error: insertError } = await supabase.from('visitas').insert({
                fecha: selectedSlot.fecha,
                hora: selectedSlot.hora,
                nombre: formData.nombre,
                apellido: formData.apellido,
                hotel: formData.hotel,
                numero_habitacion: formData.hotel === 'Externo' ? 'N/A' : formData.habitacion,
                idioma: selectedSlot.idioma,
                comentarios: formData.comentarios || null,
                estado: 'confirmada'
            })

            if (insertError) {
                // Humanize Errors
                if (insertError.code === '23505') throw new Error('Ya existe una reserva idéntica registrada.')
                throw insertError
            }

            // 2. Actualizar disponibilidad (Descontar cupo)
            const { error: updateError } = await supabase
                .from('disponibilidad')
                .update({ cupos_disponibles: Math.max(0, selectedSlot.cupos_disponibles - 1) })
                .eq('id', selectedSlot.id)

            if (updateError) {
                console.error("Error actualizando cupos:", updateError)
            }

            setSuccess(true)
            fetchFechas() // Refresh data
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al procesar la reserva.')
        } finally {
            setSubmitting(false)
        }
    }

    // Calendar Helper Functions
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const buildCalendarDays = () => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        const days = eachDayOfInterval({ start, end })

        const startDayOfWeek = start.getDay() // 0 = Sunday
        const padding = Array(startDayOfWeek).fill(null)

        return [...padding, ...days]
    }

    const getSlotsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return fechas.filter(f => f.fecha === dateStr)
    }

    // Check availability > 0 for at least one slot? 
    // Or just check if slots exist (even if full)?
    // The calendar dot should probably reflect if there are *available* slots.
    const hasAvailability = (date: Date) => {
        const slots = getSlotsForDate(date)
        // Show day as active if there are ANY slots scheduled, even if full.
        // This allows users to see "Agotado" status instead of a disabled date.
        return slots.length > 0
    }

    if (success) {
        return (
            <div className="min-h-screen bg-wine-50 flex items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center space-y-8 border border-wine-100">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-wine-900 mb-2">¡Reserva Confirmada!</h2>
                        <p className="text-gray-600 text-lg">
                            Te esperamos el <span className="font-semibold text-wine-700">{selectedSlot && format(parseISO(selectedSlot.fecha), "d 'de' MMMM", { locale: es })}</span> a las <span className="font-semibold text-wine-700">{selectedSlot?.hora.slice(0, 5)} hs</span>.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSuccess(false)
                            setSelectedSlot(null)
                            setSelectedDate(null)
                            window.scrollTo(0, 0)
                        }}
                        className="w-full bg-wine-900 text-white py-4 rounded-xl font-bold hover:bg-wine-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Realizar otra reserva
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="relative h-64 md:h-80 bg-wine-900 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-wine-900/90 to-transparent"></div>
                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 max-w-4xl mx-auto pt-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
                        Reserva tu Visita a la Bodega
                    </h1>
                    <p className="text-wine-100 mt-4 text-lg md:text-xl font-light opacity-90 max-w-2xl">
                        Vive una experiencia única en nuestra bodega Urbana. Selecciona tu fecha ideal.
                    </p>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 pb-20">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative">
                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchFechas(false)}
                        disabled={loading || isRefreshing}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-wine-600 hover:bg-wine-50 rounded-full transition-all z-30"
                        title="Actualizar disponibilidad"
                    >
                        <RefreshCw size={20} className={cn("transition-all", (loading || isRefreshing) && "animate-spin")} />
                    </button>

                    <div className="p-6 md:p-10">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-8 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-10">

                            {/* 1. Date Selection (Calendar) */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-wine-900 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-wine-600" /> Selecciona tu Fecha
                                </label>

                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <button type="button" onClick={prevMonth} className="p-2 hover:bg-white rounded-full transition shadow-sm text-wine-700"><ChevronLeft size={20} /></button>
                                        <h3 className="text-lg font-bold text-gray-800 capitalize">
                                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                                        </h3>
                                        <button type="button" onClick={nextMonth} className="p-2 hover:bg-white rounded-full transition shadow-sm text-wine-700"><ChevronRight size={20} /></button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                                        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                                            <div key={d} className="text-xs font-bold text-wine-300 uppercase">{d}</div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {buildCalendarDays().map((day, i) => {
                                            if (!day) return <div key={`empty-${i}`} />

                                            const isAvailable = hasAvailability(day)
                                            const isSelected = selectedDate && isSameDay(day, selectedDate)
                                            const isPast = isBefore(day, startOfDay(new Date()))

                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    disabled={!isAvailable || isPast}
                                                    onClick={() => {
                                                        setSelectedDate(day)
                                                        setSelectedSlot(null) // Reset slot on date change
                                                    }}
                                                    className={cn(
                                                        "h-10 w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 relative",
                                                        isSelected ? "bg-wine-600 text-white shadow-md scale-105 z-10" :
                                                            isAvailable ? "bg-white text-gray-700 hover:bg-wine-100 hover:text-wine-700 border border-gray-200 shadow-sm" :
                                                                "text-gray-300 cursor-not-allowed bg-transparent"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                    {isAvailable && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-wine-400 rounded-full" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Slot Selection (Conditional) */}
                            {selectedDate && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <label className="block text-sm font-bold text-wine-900 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-wine-600" /> Horarios Disponibles
                                    </label>
                                    {getSlotsForDate(selectedDate).length === 0 ? (
                                        <div className="text-gray-500 text-sm text-center py-8 bg-gray-50 rounded-xl border border-gray-100 italic animate-in fade-in zoom-in-95">
                                            No hay turnos programados para esta fecha.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in stagger-100">
                                            {getSlotsForDate(selectedDate).sort((a, b) => a.hora.localeCompare(b.hora)).map(slot => {
                                                const isFull = slot.cupos_disponibles <= 0
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        disabled={isFull}
                                                        onClick={() => !isFull && setSelectedSlot(slot)}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col gap-1",
                                                            selectedSlot?.id === slot.id
                                                                ? "border-wine-600 bg-wine-50 text-wine-900 ring-1 ring-wine-600"
                                                                : isFull
                                                                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                                                                    : "border-gray-200 bg-white hover:border-wine-300 hover:shadow-sm"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="block text-lg font-bold">{slot.hora.slice(0, 5)}</span>
                                                            {selectedSlot?.id === slot.id && (
                                                                <CheckCircle size={16} className="text-wine-600" />
                                                            )}
                                                        </div>

                                                        <div className="flex justify-between items-center text-xs w-full">
                                                            <span className="text-gray-500 uppercase font-medium tracking-wide flex items-center gap-1">
                                                                <Globe size={10} /> {slot.idioma}
                                                            </span>
                                                            <span className={cn("font-medium", isFull ? "text-red-500" : "text-green-600")}>
                                                                {isFull ? "AGOTADO" : `${slot.cupos_disponibles} lugares`}
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {selectedSlot && selectedSlot.cupos_disponibles <= 0 && (
                                        <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                                            No hay cupos disponibles momentáneamente
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3. Helper Text if no date selected */}
                            {!selectedDate && (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                    <p>Selecciona una fecha para ver los disponibilidad disponibles.</p>
                                </div>
                            )}

                            {/* 4. Guest Details (Only show if Slot Selected AND Available) */}
                            {selectedSlot && selectedSlot.cupos_disponibles > 0 && (
                                <div className="space-y-8 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-top-8">
                                    {/* (Rest of the form input fields omitted for brevity, keeping same logic as before) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                required
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-800"
                                                placeholder="Tu nombre"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apellido</label>
                                            <input
                                                type="text"
                                                name="apellido"
                                                value={formData.apellido}
                                                onChange={handleChange}
                                                required
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-800"
                                                placeholder="Tu apellido"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Building size={14} /> Hotel
                                            </label>
                                            <select
                                                name="hotel"
                                                value={formData.hotel}
                                                onChange={handleChange}
                                                required
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all font-medium text-gray-800"
                                            >
                                                <option value="">Seleccione...</option>
                                                <option value="Sheraton">Sheraton</option>
                                                <option value="Huentala">Huentala</option>
                                                <option value="Hualta">Hualta</option>
                                                <option value="Externo">Externo (No hospedado)</option>
                                            </select>
                                        </div>

                                        {/* Dynamic Field: Room Number OR Contact Info */}
                                        {formData.hotel === 'Externo' ? (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                    <Phone size={14} /> Contacto (Tel / Email)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.habitacion}
                                                    onChange={handleChange}
                                                    name="habitacion"
                                                    required
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-800"
                                                    placeholder="+54 9 261..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                    <MapPin size={14} /> Habitación
                                                </label>
                                                <input
                                                    type="text"
                                                    name="habitacion"
                                                    value={formData.habitacion}
                                                    onChange={handleChange}
                                                    required={formData.hotel !== 'Externo' && formData.hotel !== ''}
                                                    disabled={formData.hotel === ''}
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-800 disabled:opacity-50"
                                                    placeholder="Ej: 402"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <Globe size={14} /> Preferencia de Idioma (App)
                                        </label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-xs">
                                            {['Español', 'Inglés'].map((lang) => (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, idioma: lang })}
                                                    className={cn(
                                                        "flex-1 py-1.5 px-4 rounded-md text-sm font-semibold transition-all",
                                                        formData.idioma === lang
                                                            ? "bg-white text-wine-800 shadow-sm"
                                                            : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400">* Esto es solo una preferencia de contacto, el idioma de la visita depende del horario seleccionado.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            Comentarios (Opcional)
                                        </label>
                                        <textarea
                                            name="comentarios"
                                            value={formData.comentarios}
                                            onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-wine-500 focus:ring-4 focus:ring-wine-500/10 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-800"
                                            placeholder="Alguna necesidad especial o restricción alimentaria..."
                                            rows={2}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-wine-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-wine-800 transition transform hover:-translate-y-0.5 shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-8"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin" /> Confirmando...
                                            </>
                                        ) : (
                                            "Confirmar Reserva"
                                        )}
                                    </button>
                                </div>
                            )}

                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function ReservasPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-wine-600" size={40} />
            </div>
        }>
            <ReservasContent />
        </Suspense>
    )
}
