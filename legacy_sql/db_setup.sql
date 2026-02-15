-- Eliminar tablas existentes para reiniciar esquema
DROP TABLE IF EXISTS visitas;
DROP TABLE IF EXISTS disponibilidad;

-- Tabla de disponibilidad actualizada (Ahora incluye IDIOMA)
CREATE TABLE disponibilidad (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME NOT NULL DEFAULT '19:00:00',
  idioma VARCHAR(20) NOT NULL DEFAULT 'Español', -- Español o English
  cupos_totales INTEGER NOT NULL DEFAULT 10,
  cupos_disponibles INTEGER NOT NULL DEFAULT 10,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(fecha, hora, idioma) -- Un slot es único por fecha, hora E idioma
);

-- Tabla de visitas actualizada
CREATE TABLE visitas (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  numero_habitacion VARCHAR(20) NOT NULL,
  hotel VARCHAR(100) NOT NULL,
  idioma VARCHAR(50) NOT NULL, -- Idioma seleccionado por el usuario (debe coincidir con la disponibilidad o ser preferencia)
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'pendiente', 'cancelada')),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Índices
CREATE INDEX idx_visitas_fecha ON visitas(fecha);
CREATE INDEX idx_disponibilidad_fecha ON disponibilidad(fecha);

-- Insertar disponibilidad por defecto: Próximos 90 días
-- Para cada día, creamos un slot en Español y uno en Inglés a las 19:00 (como ejemplo base)
INSERT INTO disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
SELECT 
  d.fecha,
  '19:00:00',
  'Español',
  10,
  10,
  true
FROM (SELECT CURRENT_DATE + (n || ' days')::INTERVAL as fecha FROM generate_series(0, 90) n) d
ON CONFLICT DO NOTHING;

INSERT INTO disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
SELECT 
  d.fecha,
  '19:00:00',
  'English',
  10,
  10,
  true
FROM (SELECT CURRENT_DATE + (n || ' days')::INTERVAL as fecha FROM generate_series(0, 90) n) d
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Public Select Disponibilidad" ON disponibilidad FOR SELECT USING (true);
CREATE POLICY "Public Update Disponibilidad" ON disponibilidad FOR UPDATE USING (true);
CREATE POLICY "Public Insert Disponibilidad" ON disponibilidad FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Select Visitas" ON visitas FOR SELECT USING (true);
CREATE POLICY "Public Insert Visitas" ON visitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Visitas" ON visitas FOR UPDATE USING (true);
