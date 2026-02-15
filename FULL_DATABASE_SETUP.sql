-- SCRIPT DE INSTALACIÓN COMPLETA DE BASE DE DATOS
-- Ejecutar en el Editor SQL de Supabase

-- 1. LIMPIEZA (Opcional: Descomentar si se desea reiniciar la base de datos)
-- DROP TABLE IF EXISTS visitas;
-- DROP TABLE IF EXISTS disponibilidad;

-- 2. CREACIÓN DE TABLAS

-- Tabla de disponibilidad
CREATE TABLE IF NOT EXISTS disponibilidad (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME NOT NULL DEFAULT '19:00:00',
  idioma VARCHAR(20) NOT NULL DEFAULT 'Español', -- 'Español' o 'English'
  cupos_totales INTEGER NOT NULL DEFAULT 10,
  cupos_disponibles INTEGER NOT NULL DEFAULT 10,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(fecha, hora, idioma)
);

-- Tabla de visitas
CREATE TABLE IF NOT EXISTS visitas (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  numero_habitacion VARCHAR(20) NOT NULL,
  hotel VARCHAR(100) NOT NULL,
  idioma VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'pendiente', 'cancelada')),
  comentarios TEXT, -- Campo opcional para notas
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_visitas_fecha ON visitas(fecha);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha ON disponibilidad(fecha);

-- 4. SEGURIDAD (RLS)
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Permitir acceso público para demo/mvp)
-- Disponibilidad
DROP POLICY IF EXISTS "Public Select Disponibilidad" ON disponibilidad;
CREATE POLICY "Public Select Disponibilidad" ON disponibilidad FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Disponibilidad" ON disponibilidad;
CREATE POLICY "Public Insert Disponibilidad" ON disponibilidad FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Disponibilidad" ON disponibilidad;
CREATE POLICY "Public Update Disponibilidad" ON disponibilidad FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Disponibilidad" ON disponibilidad;
CREATE POLICY "Public Delete Disponibilidad" ON disponibilidad FOR DELETE USING (true);

-- Visitas
DROP POLICY IF EXISTS "Public Select Visitas" ON visitas;
CREATE POLICY "Public Select Visitas" ON visitas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Visitas" ON visitas;
CREATE POLICY "Public Insert Visitas" ON visitas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Visitas" ON visitas;
CREATE POLICY "Public Update Visitas" ON visitas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Visitas" ON visitas;
CREATE POLICY "Public Delete Visitas" ON visitas FOR DELETE USING (true);

-- 5. FUNCIONES Y DATOS INICIALES

-- Función para generar disponibilidad futura
CREATE OR REPLACE FUNCTION ensure_future_availability(days_ahead INT DEFAULT 90)
RETURNS void AS $$
DECLARE
  target_date DATE;
  i INT;
BEGIN
  FOR i IN 0..days_ahead LOOP
    target_date := CURRENT_DATE + i;
    
    -- Insertar slot en Español (19:00)
    INSERT INTO public.disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
    VALUES (target_date, '19:00:00', 'Español', 10, 10, true)
    ON CONFLICT (fecha, hora, idioma) DO NOTHING;

    -- Insertar slot en English (19:00)
    INSERT INTO public.disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
    VALUES (target_date, '19:00:00', 'English', 10, 10, true)
    ON CONFLICT (fecha, hora, idioma) DO NOTHING;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función para poblar los próximos 90 días
SELECT ensure_future_availability(90);
