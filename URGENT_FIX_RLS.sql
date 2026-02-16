-- ¡IMPORTANTE! Ejecuta este script manualmente en el SQL Editor de Supabase Dashboard.
-- Esto corregirá los problemas de persistencia (borrado que 'vuelve atrás') y permisos.

-- 1. Asegurar que RLS estĂ¡ activo pero limpio
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas conflictivas anteriores
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON disponibilidad;
DROP POLICY IF EXISTS "Lectura publica" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir lectura publica de disponibilidad" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir control total a autenticados" ON disponibilidad;

-- 3. Crear Política de ACCESO TOTAL para Admin (Authenticated)
-- Esto permite INSERT, UPDATE, DELETE a usuarios logueados.
CREATE POLICY "Permitir todo a autenticados" 
ON disponibilidad 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Crear Política de LECTURA para Todo el Mundo (Anon + Authenticated)
-- Esto permite que el panel de reservas vea los horarios.
CREATE POLICY "Lectura publica" 
ON disponibilidad 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Verificación opcional:
-- Comprueba que las políticas se crearon
SELECT * FROM pg_policies WHERE tablename = 'disponibilidad';
