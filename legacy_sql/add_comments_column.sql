-- Add optional 'comentarios' column to visitas table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitas' AND column_name = 'comentarios') THEN
        ALTER TABLE visitas ADD COLUMN comentarios TEXT;
    END IF;
END $$;
