import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})

// Tipos de base de datos
export interface Visita {
    id: number
    fecha: string
    hora: string
    nombre: string
    apellido: string
    numero_habitacion: string
    hotel: string
    idioma: string
    estado: 'confirmada' | 'pendiente' | 'cancelada'
    fecha_creacion: string
    comentarios?: string
}

export interface Disponibilidad {
    id: number
    fecha: string
    hora: string
    idioma: string
    cupos_totales: number
    cupos_disponibles: number
    habilitado: boolean
}
