-- EJECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA ARREGLAR PERSISTENCIA DEFINITIVAMENTE

BEGIN;

-- 1. Habilitar RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar cualquier polĂ­tica previa que pudiera bloquear
DROP POLICY IF EXISTS "Acceso total administradores" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir borrado total a autenticados" ON disponibilidad;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON disponibilidad;
DROP POLICY IF EXISTS "Enable delete for admin only" ON disponibilidad;

-- 3. Crear polĂ­tica de ACCESO TOTAL para administradores
-- Esto permite DELETE a cualquier usuario autenticado
CREATE POLICY "Acceso total administradores" 
ON disponibilidad 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Habilitar Replica Identity Full (para que Realtime funcione con DELETE)
ALTER TABLE disponibilidad REPLICA IDENTITY FULL;

COMMIT;

-- VerificaciĂłn
SELECT * FROM pg_policies WHERE tablename = 'disponibilidad';
