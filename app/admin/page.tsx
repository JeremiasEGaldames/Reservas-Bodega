'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Visita, Disponibilidad } from '@/lib/supabase'
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Calendar as CalendarIcon,
    Users,
    Languages,
    Loader2,
    Plus,
    Trash2,
    Clock,
    X,
    BarChart3,
    Home,
    Settings,
    Search,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    ArrowLeft,
    Bell,
    RefreshCw
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'
import AllReservationsView from './AllReservationsView'

import { cn } from '@/lib/utils'

type ViewState = 'home' | 'analytics' | 'schedule' | 'reservations'

export default function AdminDashboard() {
    const router = useRouter()

    // Session check handled by AuthGuard
    useEffect(() => {
        // Optional: specific admin logic here if needed, but authenticaton is global
    }, [])

    const [currentView, setCurrentView] = useState<ViewState>('home')
    const [loading, setLoading] = useState(true)
    const [visitas, setVisitas] = useState<Visita[]>([])
    const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])

    // Global Date Selection
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Calendar Picker State
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // Slot Management
    const [isAddingSlot, setIsAddingSlot] = useState(false)
    const [newSlot, setNewSlot] = useState({
        hora: '19:00',
        idioma: 'Español',
        cupos: 15
    })

    // Analytics State
    const [analyticsLoading, setAnalyticsLoading] = useState(false)
    const [analyticsData, setAnalyticsData] = useState<{
        dailyHistory: { date: string, total: number, es: number, en: number }[];
        totals: { es: number, en: number, all: number };
    }>({
        dailyHistory: [],
        totals: { es: 0, en: 0, all: 0 }
    })

    // Search State
    const [searchTerm, setSearchTerm] = useState('')

    // Metrics for Selected Date
    const [dailyStats, setDailyStats] = useState({
        total: 0,
        en: 0,
        es: 0,
        occupancy: 0
    })

    // Real-time Sync Indicator
    const [isSyncing, setIsSyncing] = useState(false)

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    })

    useEffect(() => {
        fetchDailyData()

        // Real-time subscription
        const channel = supabase
            .channel('realtime_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas' }, () => {
                setIsSyncing(true)
                fetchDailyData()
                if (currentView === 'analytics') fetchAnalyticsData()
                setTimeout(() => setIsSyncing(false), 2000)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidad' }, () => {
                setIsSyncing(true)
                fetchDailyData()
                setTimeout(() => setIsSyncing(false), 2000)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate])

    // Fetch analytics when view changes to analytics
    useEffect(() => {
        if (currentView === 'analytics') {
            fetchAnalyticsData()
        }
    }, [currentView])

    const generateMockData = () => {
        const dates: Disponibilidad[] = []
        const today = new Date()
        for (let i = 0; i < 90; i++) {
            const d = new Date(today)
            d.setDate(today.getDate() + i)
            dates.push({
                id: i + 1000,
                fecha: d.toISOString().split('T')[0],
                hora: '19:00:00',
                idioma: 'Español',
                cupos_totales: 10,
                cupos_disponibles: 8,
                habilitado: true
            })
            dates.push({
                id: i + 2000,
                fecha: d.toISOString().split('T')[0],
                hora: '19:00:00',
                idioma: 'English',
                cupos_totales: 10,
                cupos_disponibles: 10,
                habilitado: true
            })
        }
        return dates
    }

    const fetchAnalyticsData = async () => {
        setAnalyticsLoading(true)
        try {
            // Fetch last 30 days
            const endDate = new Date()
            const startDate = subDays(endDate, 30)

            let allVisits: Visita[] = []

            const { data, error } = await supabase
                .from('visitas')
                .select('*')
                .gte('fecha', format(startDate, 'yyyy-MM-dd'))
                .lte('fecha', format(endDate, 'yyyy-MM-dd'))

            if (!error && data) {
                allVisits = data
            }

            // Process data
            const historyMap = new Map()
            let totalEs = 0
            let totalEn = 0

            allVisits.forEach(v => {
                const d = v.fecha
                if (!historyMap.has(d)) historyMap.set(d, { date: d, total: 0, es: 0, en: 0 })
                const entry = historyMap.get(d)
                entry.total++

                const isEs = v.idioma === 'Español' || v.idioma === 'Spanish'
                if (isEs) {
                    entry.es++
                    totalEs++
                } else {
                    entry.en++
                    totalEn++
                }
            })

            // Fill in missing days
            const daysInterval = eachDayOfInterval({ start: startDate, end: endDate })
            const history = daysInterval.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                if (historyMap.has(dateStr)) return historyMap.get(dateStr)
                return { date: dateStr, total: 0, es: 0, en: 0 }
            })

            setAnalyticsData({
                dailyHistory: history,
                totals: { es: totalEs, en: totalEn, all: allVisits.length }
            })

        } catch (e) {
            console.error(e)
        } finally {
            setAnalyticsLoading(false)
        }
    }

    const fetchDailyData = async () => {
        setLoading(true)
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            let dataDisp: Disponibilidad[] = []
            let dataVisitas: Visita[] = []

            // Fetch Visitas for Date
            console.log("Fetching visitas for date:", dateStr);
            const { data: vParams, error: vError } = await supabase
                .from('visitas')
                .select('*')
                .eq('fecha', dateStr)
                .order('hora', { ascending: true })

            console.log("Visitas fetch result:", { data: vParams, error: vError });

            if (vError) throw vError
            dataVisitas = vParams || []

            // Fetch Disponibilidad for Date
            console.log("Fetching disponibilidad for date:", dateStr);
            const { data: dParams, error: dError } = await supabase
                .from('disponibilidad')
                .select('*')
                .eq('fecha', dateStr)
                .order('hora', { ascending: true })
                .order('idioma', { ascending: true })

            console.log("Disponibilidad fetch result:", { data: dParams, error: dError });

            if (dError) throw dError
            dataDisp = dParams || []

            setVisitas(dataVisitas)
            setDisponibilidad(dataDisp)

            // Calc stats
            const total = dataVisitas.length
            const en = dataVisitas.filter(v => v.idioma === 'Inglés' || v.idioma === 'English').length
            const es_count = dataVisitas.filter(v => v.idioma === 'Español' || v.idioma === 'Spanish').length
            const totalCap = dataDisp.reduce((acc, curr) => acc + curr.cupos_totales, 0)
            const totalBooked = dataDisp.reduce((acc, curr) => acc + (curr.cupos_totales - curr.cupos_disponibles), 0)
            const occ = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0

            setDailyStats({ total, en, es: es_count, occupancy: occ })

        } catch (error) {
            console.error('Critical Error', error)
        } finally {
            setLoading(false)
        }
    }

    const confirmAction = (title: string, message: string, action: () => void, variant: 'danger' | 'info' = 'danger') => {
        setModal({
            isOpen: true,
            title,
            message,
            onConfirm: action,
            variant
        })
    }

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }))
    }

    const handleAddSlot = async () => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
            toast.error('Modo Demo Activo', {
                description: 'No se pueden realizar cambios sin configurar las variables de entorno.'
            })
            return
        }
        try {
            const existing = disponibilidad.find(d => d.hora.startsWith(newSlot.hora) && d.idioma === newSlot.idioma)
            if (existing) {
                toast.error('Conflicto de Horarios', {
                    description: 'Ya existe un turno configurado con el mismo horario e idioma.',
                    action: {
                        label: 'Entendido',
                        onClick: () => { }
                    },
                    duration: 4000
                })
                return
            }

            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const { error } = await supabase.from('disponibilidad').insert([{
                fecha: dateStr,
                hora: newSlot.hora,
                idioma: newSlot.idioma,
                cupos_totales: newSlot.cupos,
                cupos_disponibles: newSlot.cupos,
                habilitado: true
            }])

            if (error) throw error
            setIsAddingSlot(false)
            fetchDailyData()
            toast.success('Horario Creado', {
                description: 'El nuevo bloque horario ha sido añadido correctamente.',
                duration: 3000
            })
        } catch (e: any) {
            if (e.code === '23505') {
                toast.error('Disponibilidad Duplicada', {
                    description: 'Ya existe una disponibilidad con la misma fecha, hora e idioma.',
                    duration: 4000
                })
            } else {
                toast.error('Error del Sistema', {
                    description: e.message
                });
            }
        }
    }

    const handleAddDefaults = async () => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const defaults = [
            { hora: '19:00', idioma: 'Español', cupos: 15 },
            { hora: '19:30', idioma: 'Inglés', cupos: 15 } // 19:30 en Inglés por defecto
        ]

        let added = 0
        const toastId = toast.loading('Creando horarios base...')

        try {
            for (const slot of defaults) {
                // Check local duplicate first to be efficient
                const exists = disponibilidad.some(d => d.hora.startsWith(slot.hora) && d.idioma === slot.idioma)
                if (exists) continue

                const { error } = await supabase.from('disponibilidad').insert({
                    fecha: dateStr,
                    hora: slot.hora,
                    idioma: slot.idioma,
                    cupos_totales: slot.cupos,
                    cupos_disponibles: slot.cupos,
                    habilitado: true
                })

                if (error && error.code !== '23505') throw error
                if (!error) added++
            }

            if (added > 0) {
                toast.success(`${added} Horarios agregados`, { id: toastId })
                fetchDailyData()
            } else {
                toast.info('Los horarios estándar ya existen para este día', { id: toastId })
            }
        } catch (e: any) {
            toast.error('Error creando defaults', { description: e.message, id: toastId })
        }
    }

    const handleDeleteSlot = (id: number) => {
        confirmAction(
            "Eliminar Horario",
            "¿Estás seguro de que deseas eliminar este horario? Se eliminará toda la disponibilidad asociada.",
            async () => {
                console.log("Attempting to delete slot:", id);
                const { error, count } = await supabase.from('disponibilidad').delete({ count: 'exact' }).eq('id', id)
                console.log("Delete response:", { error, count });

                if (error) {
                    console.error('Error deleting slot:', error)
                    toast.error('Error al eliminar', { description: error.message })
                } else if (count === 0) {
                    toast.error('No se pudo eliminar', { description: 'El horario no existe o no tienes permisos.' })
                } else {
                    fetchDailyData()
                    closeModal()
                    toast.success('Horario Eliminado', {
                        description: 'La disponibilidad se ha eliminado correctamente.'
                    })
                }
            }
        )
    }

    const handleDeleteReserva = (id: number) => {
        confirmAction(
            "Eliminar Reserva",
            "¿Estás seguro? Esto eliminará la reserva permanentemente.",
            async () => {
                try {
                    console.log("Attempting to delete reserva:", id);
                    const { error, count } = await supabase.from('visitas').delete({ count: 'exact' }).eq('id', id)
                    console.log("Delete reserva response:", { error, count });

                    if (error) throw error
                    if (count === 0) throw new Error("No se encontró la reserva o no tienes permisos.")

                    fetchDailyData()
                    closeModal()
                    toast.success('Reserva Eliminada', {
                        description: 'La reserva ha sido eliminada del sistema.'
                    })
                } catch (e: any) {
                    console.error(e)
                    toast.error('Error al eliminar', { description: e.message })
                }
            }
        )
    }

    const handleUpdateCupos = async (id: number, currentTotal: number, currentAvailable: number, newTotal: number) => {
        const diff = newTotal - currentTotal
        const newAvailable = currentAvailable + diff
        if (newAvailable < 0) {
            toast.error('Operación Inválida', {
                description: 'No se puede reducir la capacidad por debajo de la cantidad de reservas actuales.',
                duration: 4000
            })
            return
        }

        console.log("Updating cupos for:", id);
        const { error, count } = await supabase.from('disponibilidad').update({
            cupos_totales: newTotal,
            cupos_disponibles: newAvailable
        }, { count: 'exact' }).eq('id', id)
        console.log("Update cupos response:", { error, count });

        if (error) {
            toast.error('Error al actualizar', { description: error.message })
        } else if (count === 0) {
            toast.error('No se pudo actualizar', { description: 'Registro no encontrado o sin permisos.' })
        } else {
            fetchDailyData()
        }
    }

    const handleUpdateIdioma = async (id: number, newIdioma: string) => {
        try {
            console.log("Updating idioma for:", id, newIdioma);
            const { error, count } = await supabase.from('disponibilidad').update({
                idioma: newIdioma
            }, { count: 'exact' }).eq('id', id)
            console.log("Update idioma response:", { error, count });

            if (error) throw error
            if (count === 0) throw new Error("No se pudo actualizar (Registro no encontrado o permisos insuficientes).")

            fetchDailyData()
            toast.success('Idioma Actualizado', {
                description: `El idioma del turno ha sido cambiado a ${newIdioma}.`,
                duration: 3000,
                style: {
                    background: '#fdf2f8',
                    border: '1px solid #fce7f3',
                    color: '#831843'
                }
            })
        } catch (e: any) {
            toast.error('Error al actualizar', {
                description: e.message
            })
        }
    }

    // --- Calendar Logic ---
    const buildCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
        return eachDayOfInterval({ start: startDate, end: endDate })
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans overflow-hidden">

            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                isSyncing={isSyncing}
            />

            <Toaster position="top-right" richColors />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header Strip */}
                <Header
                    currentView={currentView}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    isCalendarOpen={isCalendarOpen}
                    setIsCalendarOpen={setIsCalendarOpen}
                    currentMonth={currentMonth}
                    setCurrentMonth={setCurrentMonth}
                    buildCalendarDays={buildCalendarDays}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 scrollbar-thin scrollbar-thumb-gray-200">

                    {currentView === 'home' && (
                        <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <HomeView
                                dailyStats={dailyStats}
                                visitas={visitas}
                                disponibilidad={disponibilidad}
                                searchTerm={searchTerm}
                                setIsAddingSlot={setIsAddingSlot}
                                handleDeleteReserva={handleDeleteReserva}
                                setCurrentView={setCurrentView}
                                onRefresh={fetchDailyData}
                                loading={loading}
                                handleAddDefaults={handleAddDefaults}
                            />
                        </div>
                    )}

                    {currentView === 'schedule' && (
                        <ScheduleView
                            selectedDate={selectedDate}
                            isAddingSlot={isAddingSlot}
                            setIsAddingSlot={setIsAddingSlot}
                            disponibilidad={disponibilidad}
                            newSlot={newSlot}
                            setNewSlot={setNewSlot}
                            handleAddSlot={handleAddSlot}
                            handleDeleteSlot={handleDeleteSlot}
                            handleUpdateCupos={handleUpdateCupos}
                            handleUpdateIdioma={handleUpdateIdioma}
                        />
                    )}

                    {currentView === 'reservations' && (
                        <AllReservationsView
                            handleDeleteReserva={handleDeleteReserva}
                        />
                    )}

                    {currentView === 'analytics' && (
                        <AnalyticsView
                            loading={analyticsLoading}
                            data={analyticsData}
                        />
                    )}
                </main>

                {/* Confirm Modal */}
                {modal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", modal.variant === 'danger' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500")}>
                                    {modal.variant === 'danger' ? <AlertCircle size={24} /> : <Loader2 size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{modal.title}</h3>
                                    <p className="text-sm text-gray-500 mt-2">{modal.message}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                    <button onClick={closeModal} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">
                                        Cancelar
                                    </button>
                                    <button onClick={() => { if (modal.onConfirm) modal.onConfirm() }} className={cn("px-4 py-2 text-white rounded-xl font-bold transition shadow-lg", modal.variant === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-200" : "bg-wine-600 hover:bg-wine-700 shadow-wine-200")}>
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function Sidebar({ currentView, setCurrentView, isSyncing }: any) {
    return (
        <aside className="
            w-full h-16 fixed bottom-0 z-50 bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-row justify-around items-center px-4
            md:relative md:w-20 md:h-full md:flex-col md:justify-start md:py-8 md:gap-8 md:shadow-2xl md:px-0
        ">
            <Link
                href="/"
                className="hidden md:flex w-10 h-10 bg-wine-600 rounded-xl items-center justify-center text-white font-bold text-xl shadow-lg shadow-wine-900/50 mb-4 cursor-pointer hover:scale-105 transition-transform"
                title="Volver al Panel General"
            >
                B
            </Link>

            <nav className="flex flex-row md:flex-col gap-1 md:gap-6 w-full justify-between md:justify-start">
                <SidebarIcon
                    icon={<Home size={22} />}
                    active={currentView === 'home'}
                    onClick={() => setCurrentView('home')}
                    label="Inicio"
                />
                <SidebarIcon
                    icon={<BarChart3 size={22} />}
                    active={currentView === 'analytics'}
                    onClick={() => setCurrentView('analytics')}
                    label="Analytics"
                />
                <SidebarIcon
                    icon={<Settings size={22} />}
                    active={currentView === 'schedule'}
                    onClick={() => setCurrentView('schedule')}
                    label="Horarios"
                />
                <SidebarIcon
                    icon={<Users size={22} />}
                    active={currentView === 'reservations'}
                    onClick={() => setCurrentView('reservations')}
                    label="Listado"
                />
            </nav>

            <div className="hidden md:flex mt-auto flex-col gap-4">
                <div className={cn("w-3 h-3 rounded-full transition-colors duration-500", isSyncing ? "bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" : "bg-gray-700")} title={isSyncing ? "Sincronizando..." : "Conectado"} />
            </div>
        </aside>
    )
}

function Header({ currentView, selectedDate, setSelectedDate, searchTerm, setSearchTerm, isCalendarOpen, setIsCalendarOpen, currentMonth, setCurrentMonth, buildCalendarDays }: any) {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-20 sticky top-0 md:relative">
            <div className="flex items-center gap-4">
                <Link href="/" className="md:hidden min-w-[32px] h-8 bg-wine-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    B
                </Link>
                <h1 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight truncate max-w-[200px] md:max-w-none">
                    {currentView === 'home' && 'Dashboard'}
                    {currentView === 'analytics' && 'Métricas y Reportes'}
                    {currentView === 'schedule' && 'Configuración de Horarios'}
                    {currentView === 'reservations' && 'Listado General de Reservas'}
                </h1>
            </div>

            <div className="flex items-center gap-6">

                <div className="relative">
                    <button
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-wine-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 shadow-sm transition-all"
                    >
                        <CalendarIcon size={16} className="text-wine-600" />
                        <span>{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</span>
                    </button>

                    {isCalendarOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsCalendarOpen(false)}></div>
                            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 w-80 z-20 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={20} /></button>
                                    <span className="font-bold text-gray-800 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={20} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {buildCalendarDays().map((day: Date, i: number) => {
                                        const isSelected = isSameDay(day, selectedDate)
                                        const isCurrentMonth = isSameMonth(day, currentMonth)
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setSelectedDate(day)
                                                    setIsCalendarOpen(false)
                                                }}
                                                disabled={!isCurrentMonth}
                                                className={cn(
                                                    "h-9 w-9 rounded-lg flex items-center justify-center text-sm transition-all relative",
                                                    !isCurrentMonth && "text-gray-200",
                                                    isCurrentMonth && "hover:bg-wine-50 text-gray-700",
                                                    isSelected && "bg-wine-600 text-white font-bold shadow-md hover:bg-wine-700"
                                                )}
                                            >
                                                {format(day, 'd')}
                                                {isSameDay(day, new Date()) && !isSelected && (
                                                    <div className="absolute bottom-1 w-1 h-1 bg-wine-500 rounded-full"></div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

function HomeView({ dailyStats, visitas, disponibilidad, searchTerm, setIsAddingSlot, handleDeleteReserva, setCurrentView, onRefresh, loading }: any) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnalyticsCard
                    title="Total Reservas"
                    value={dailyStats.total}
                    subtitle="Para hoy"
                    icon={<Users size={20} />}
                    change="+12%"
                />
                <AnalyticsCard
                    title="Ocupación"
                    value={`${dailyStats.occupancy}%`}
                    subtitle="Capacidad utilizada"
                    icon={<BarChart3 size={20} />}
                    highlight={dailyStats.occupancy > 80}
                />
                <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-gray-300 font-medium text-sm">Distribución de Idioma</h3>
                                <p className="text-xs text-gray-400 mt-1">Basado en reservas de hoy</p>
                            </div>
                            <Languages className="text-wine-400" />
                        </div>
                        <div className="space-y-4 mt-6">
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="font-semibold text-gray-200">Español</span>
                                    <span>{dailyStats.es} visitas</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${dailyStats.total ? (dailyStats.es / dailyStats.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="font-semibold text-gray-200">English</span>
                                    <span>{dailyStats.en} visitas</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${dailyStats.total ? (dailyStats.en / dailyStats.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800 text-lg">Huéspedes del Día</h3>
                            <button
                                onClick={onRefresh}
                                className="p-2 text-gray-400 hover:text-wine-600 hover:bg-wine-50 rounded-full transition-all active:scale-95"
                                title="Actualizar lista"
                                disabled={loading}
                            >
                                <RefreshCw size={18} className={cn("transition-all", loading && "animate-spin")} />
                            </button>
                        </div>
                        <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded-md shadow-sm">
                            {visitas.length} reservas
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-0">
                        {visitas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                <div className="bg-gray-50 p-6 rounded-full">
                                    <CalendarIcon size={32} />
                                </div>
                                <p>Sin reservas activas para esta fecha</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs text-gray-500 uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Huésped</th>
                                            <th className="px-6 py-4 text-left">Turno</th>
                                            <th className="px-6 py-4 text-left">Origen</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {visitas.filter((v: Visita) =>
                                            searchTerm === '' ||
                                            v.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            v.apellido.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((v: Visita) => (
                                            <tr key={v.id} className="group hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wine-100 to-wine-200 text-wine-800 flex items-center justify-center font-bold text-xs shadow-sm">
                                                            {v.nombre[0]}{v.apellido[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">{v.nombre} {v.apellido}</div>
                                                            <div className="text-xs text-gray-500">{v.hotel}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">{v.hora.slice(0, 5)}</span>
                                                        <Badge type={v.idioma} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-600">Hab. {v.numero_habitacion}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteReserva(v.id)}
                                                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all md:opacity-0 md:group-hover:opacity-100"
                                                        title="Eliminar reserva"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800">Estado del Día</h3>
                            <button onClick={() => setCurrentView('schedule')} className="text-xs font-bold text-wine-600 hover:underline">Gestionar Horarios</button>
                        </div>

                        {disponibilidad.length > 0 ? disponibilidad.map((slot: Disponibilidad) => (
                            <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", slot.cupos_disponibles > 0 ? "bg-green-500" : "bg-red-500")} />
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{slot.hora.slice(0, 5)}</div>
                                        <div className="text-xs text-gray-500">{slot.idioma}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm font-bold text-gray-700">{slot.cupos_disponibles}/{slot.cupos_totales}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Libres</div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                No hay turnos configurados
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setCurrentView('schedule')
                                setIsAddingSlot(true)
                            }}
                            className="w-full py-3 mt-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Agregar Turno Rápido
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

function ScheduleView({ selectedDate, isAddingSlot, setIsAddingSlot, disponibilidad, newSlot, setNewSlot, handleAddSlot, handleDeleteSlot, handleUpdateCupos, handleUpdateIdioma, handleAddDefaults }: any) {
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Horarios</h2>
                    <p className="text-gray-500">Configura la disponibilidad para {format(selectedDate, "d 'de' MMMM", { locale: es })}.</p>
                </div>
                <button
                    onClick={() => setIsAddingSlot(true)}
                    className="bg-wine-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-wine-700 transition shadow-lg shadow-wine-200 flex items-center gap-2"
                >
                    <Plus size={20} /> Nuevo Horario
                </button>
            </div>

            {/* Quick Actions for Defaults */}
            {disponibilidad.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Configuración Rápida</h4>
                        <p className="text-xs text-blue-600">Este día no tiene horarios. Puedes cargar la estructura estándar con un click.</p>
                    </div>
                    <button
                        onClick={handleAddDefaults}
                        className="bg-white text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> Cargar Base (19:00/19:30)
                    </button>
                </div>
            )}

            {isAddingSlot && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-wine-100 mb-8 animate-in zoom-in-95 relative">
                    <button onClick={() => setIsAddingSlot(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
                    <h3 className="font-bold text-lg text-gray-800 mb-6">Crear Nuevo Bloque Horario</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Horario</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="time"
                                    value={newSlot.hora}
                                    onChange={(e: any) => setNewSlot({ ...newSlot, hora: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wine-500 outline-none transition font-semibold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Idioma</label>
                            <div className="relative">
                                <Languages className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    value={newSlot.idioma}
                                    onChange={(e: any) => setNewSlot({ ...newSlot, idioma: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wine-500 outline-none transition appearance-none"
                                >
                                    <option value="Español">Español</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Capacidad Total</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="number"
                                    value={newSlot.cupos}
                                    onChange={(e: any) => setNewSlot({ ...newSlot, cupos: parseInt(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wine-500 outline-none transition font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsAddingSlot(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                        <button onClick={handleAddSlot} className="px-8 py-2 bg-wine-600 text-white font-bold rounded-lg hover:bg-wine-700 transition">Guardar</button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {disponibilidad.map((slot: Disponibilidad) => (
                    <div key={slot.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-wine-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100 group-hover:bg-wine-50 group-hover:text-wine-700 transition-colors">
                                <span className="font-bold text-xl">{slot.hora.slice(0, 5)}</span>
                                <span className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-wine-400">HS</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge type={slot.idioma as any} size="lg" />
                                    {!slot.habilitado && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold uppercase">Cerrado</span>}
                                </div>
                                <select
                                    className="text-gray-500 text-sm font-light bg-transparent border border-transparent hover:border-gray-200 rounded cursor-pointer outline-none transition-all px-1 py-0.5"
                                    value={slot.idioma}
                                    onChange={(e) => handleUpdateIdioma(slot.id, e.target.value)}
                                >
                                    <option value="Español">Español</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full md:w-auto">
                            <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-auto">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ocupación</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-gray-900">{slot.cupos_totales - slot.cupos_disponibles}</span>
                                    <span className="text-gray-300 text-xl font-light">/</span>
                                    <input
                                        type="number"
                                        defaultValue={slot.cupos_totales}
                                        className="w-16 text-center border-b-2 border-gray-200 focus:border-wine-500 font-bold text-xl text-gray-600 outline-none bg-transparent py-0"
                                        onBlur={(e) => handleUpdateCupos(slot.id, slot.cupos_totales, slot.cupos_disponibles, parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="hidden md:block h-10 w-px bg-gray-100"></div>

                            <div className="flex gap-2 w-full md:w-auto justify-end">
                                <button
                                    className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors w-full md:w-auto flex items-center justify-center"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    title="Eliminar Horario"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AnalyticsView({ loading, data }: any) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 size={32} className="animate-spin mb-4 text-wine-600" />
                <p>Cargando reporte histórico...</p>
            </div>
        )
    }

    const maxVal = Math.max(...data.dailyHistory.map((d: any) => d.total), 1)

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">Analytics & Reportes</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-500 font-medium mb-1">Total Visitas (30 días)</p>
                        <h3 className="text-4xl font-bold text-gray-900">{data.totals.all}</h3>
                    </div>
                    <Users className="absolute right-4 bottom-4 text-gray-100 -z-0" size={48} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 font-bold text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Español
                        </span>
                        <span className="font-mono">{data.totals.es}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${(data.totals.es / data.totals.all) * 100}%` }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 font-bold text-gray-700">
                            <div className="w-2 h-2 rounded-full bg-blue-500" /> Inglés
                        </span>
                        <span className="font-mono">{data.totals.en}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(data.totals.en / data.totals.all) * 100}%` }} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-wine-600" /> Demanda Diaria (30 Días)
                </h3>

                <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4 scrollbar-thin">
                    {data.dailyHistory.map((day: any, i: number) => {
                        const height = (day.total / maxVal) * 100
                        const esHeight = (day.total ? (day.es / day.total) * 100 : 0)
                        const enHeight = (day.total ? (day.en / day.total) * 100 : 0)

                        return (
                            <div key={i} className="flex flex-col items-center gap-2 group min-w-[30px] flex-1">
                                <div className="w-full max-w-[40px] rounded-t-lg bg-gray-50 relative overflow-hidden flex flex-col-reverse hover:opacity-80 transition-opacity border border-gray-100" style={{ height: `${height}%` }}>
                                    <div className="w-full bg-yellow-400" style={{ height: `${esHeight}%` }} title={`ES: ${day.es}`} />
                                    <div className="w-full bg-blue-400" style={{ height: `${enHeight}%` }} title={`EN: ${day.en}`} />
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono rotate-45 mt-2 origin-left">{format(parseISO(day.date), 'dd/MM')}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 bg-yellow-400 rounded" /> Español
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 bg-blue-400 rounded" /> Inglés
                    </div>
                </div>
            </div>
        </div>
    )
}

function SidebarIcon({ icon, active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full h-full md:w-12 md:h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 relative group",
                active ? "md:bg-white text-wine-400 md:text-gray-900 md:shadow-lg" : "text-gray-500 hover:text-white md:hover:bg-gray-800"
            )}
        >
            {icon}
            <span className={cn(
                "hidden md:block absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
            )}>
                {label}
            </span>
            <span className="text-[10px] md:hidden mt-1 font-medium">{label}</span>
        </button>
    )
}

function AnalyticsCard({ title, value, subtitle, icon, change, highlight }: any) {
    return (
        <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow", highlight && "ring-2 ring-wine-100")}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500 font-medium">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={cn("p-2 rounded-lg", highlight ? "bg-wine-50 text-wine-600" : "bg-gray-50 text-gray-400")}>
                    {icon}
                </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
                <p className="text-xs text-gray-400">{subtitle}</p>
                {change && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{change}</span>}
            </div>
        </div>
    )
}

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
