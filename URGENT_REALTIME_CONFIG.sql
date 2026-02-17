-- EJECUTAR ESTO EN EL SQL EDITOR DE SUPABASE
-- Es necesario para que el borrado se refleje inmediatamente en todos los clientes.

-- 1. Habilitar REPLICA IDENTITY FULL
-- Esto asegura que los eventos DELETE contengan el registro completo (o al menos ID garantizado)
ALTER TABLE disponibilidad REPLICA IDENTITY FULL;

-- 2. Asegurar que la tabla estĂ¡ en la publicaciĂłn de realtime
-- Si ya estaba agregada, esto no hace daĂ±o, o puede dar error de "ya existe", ignorar si es el caso.
-- Pero para estar seguros:
ALTER PUBLICATION supabase_realtime ADD TABLE disponibilidad;

-- 3. VerificaciĂłn (Opcional)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
