-- Add DELETE capability to RLS policies
-- Without this, delete operations are silently ignored by Supabase

CREATE POLICY "Public Delete Disponibilidad" ON disponibilidad FOR DELETE USING (true);
CREATE POLICY "Public Delete Visitas" ON visitas FOR DELETE USING (true);
