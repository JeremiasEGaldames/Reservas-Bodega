-- Ejecuta este comando en el Editor SQL de Supabase para activar Realtime en la tabla disponibilidad
-- Esto permite que los clientes (Panel Reservas) reciban notificaciones de cambios (INSERT, UPDATE, DELETE)

BEGIN;
  -- Asegurar que la publicación existe (por defecto en Supabase suele existir)
  -- Si no existe, crearla: CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  
  -- Agregar la tabla disponibilidad a la publicación
  ALTER PUBLICATION supabase_realtime ADD TABLE disponibilidad;
  
  -- Verificar configuración de réplica (opcional pero recomendado para DELETE via ID)
  ALTER TABLE disponibilidad REPLICA IDENTITY FULL;
COMMIT;
