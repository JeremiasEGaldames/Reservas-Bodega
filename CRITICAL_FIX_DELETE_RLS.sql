-- EJECUTAR INMEDIATAMENTE EN SUPABASE SQL EDITOR
-- Esto soluciona el problema de que los horarios borrados "reaparecen" (permisos denegados).

-- Asegurar que Row Level Security está activo
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- Eliminar polĂ­ticas restrictivas anteriores que pudieran impedir el borrado
DROP POLICY IF EXISTS "Permitir borrado total a autenticados" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON disponibilidad;
DROP POLICY IF EXISTS "Enable delete for admin only" ON disponibilidad;

-- CREAR POLÍTICA PERMISIVA PARA ADMINS (Authenticated)
-- Permite SELECT, INSERT, UPDATE, DELETE sin restricciones para usuarios logueados.
CREATE POLICY "Permitir borrado total a autenticados" 
ON disponibilidad 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- VerificaciĂłn:
SELECT * FROM pg_policies WHERE tablename = 'disponibilidad';
