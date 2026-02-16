-- 1. HABILITAR RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA 'DISPONIBILIDAD'

-- SELECT: Permitido a cualquier usuario autenticado
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON disponibilidad;
CREATE POLICY "Enable read access for authenticated users" ON disponibilidad
FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Permitido a cualquier usuario autenticado (Staff cargando horarios)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON disponibilidad;
CREATE POLICY "Enable insert for authenticated users" ON disponibilidad
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Permitido a cualquier usuario autenticado (Modificar cupos tras reserva)
DROP POLICY IF EXISTS "Enable update for authenticated users" ON disponibilidad;
CREATE POLICY "Enable update for authenticated users" ON disponibilidad
FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE: Solo permitido a administradores
-- (En este esquema simple, asumimos que el email 'admin@bodega.com' es el super admin, 
--  o permitimos a todos los authenticated si son staff de confianza. 
--  Ajusta el email abajo según tu usuario real o usa auth.role() = 'authenticated' si todos pueden borrar).
DROP POLICY IF EXISTS "Enable delete for admins only" ON disponibilidad;
CREATE POLICY "Enable delete for admins only" ON disponibilidad
FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@bodega.com');


-- 3. POLÍTICAS PARA 'VISITAS' (Reservas)

-- SELECT: Staff autenticado puede ver todas
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visitas;
CREATE POLICY "Enable read access for authenticated users" ON visitas
FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Staff autenticado puede crear reservas
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON visitas;
CREATE POLICY "Enable insert for authenticated users" ON visitas
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Staff autenticado puede modificar
DROP POLICY IF EXISTS "Enable update for authenticated users" ON visitas;
CREATE POLICY "Enable update for authenticated users" ON visitas
FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE: Solo administradores (misma lógica)
DROP POLICY IF EXISTS "Enable delete for admins only" ON visitas;
CREATE POLICY "Enable delete for admins only" ON visitas
FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@bodega.com');
