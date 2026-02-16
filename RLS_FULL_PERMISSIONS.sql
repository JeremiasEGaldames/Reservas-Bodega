-- Habilitar RLS en la tabla disponibilidad
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Enable read access for all users" ON disponibilidad;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON disponibilidad;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON disponibilidad;
DROP POLICY IF EXISTS "Enable delete for admin only" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir lectura publica de disponibilidad" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON disponibilidad;

-- 2. Permitir LECTURA a todo el mundo (necesario para que el formulario de reservas vea los cupos)
CREATE POLICY "Permitir lectura publica de disponibilidad"
ON disponibilidad FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Permitir CONTROL TOTAL (All: Select, Insert, Update, Delete) solo a usuarios AUTENTICADOS (Admin)
CREATE POLICY "Permitir control total a autenticados"
ON disponibilidad FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verificación de permisos para la tabla 'visitas' (por si acaso)
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de visitas" ON visitas; -- No queremos que cualquiera lea visitas
DROP POLICY IF EXISTS "Permitir insercion publica de visitas" ON visitas;

-- Permitir insertar visitas a anonimos (para que el formulario funcione)
CREATE POLICY "Permitir insercion publica de visitas"
ON visitas FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir a autenticados (Admin) ver y borrar visitas
DROP POLICY IF EXISTS "Permitir control total visitas a autenticados" ON visitas;
CREATE POLICY "Permitir control total visitas a autenticados"
ON visitas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
