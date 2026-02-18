-- FIX_LOGIN_LOOP.sql
-- Restaura funciones críticas de autenticación y asegura roles de administrador

-- 1. Asegurar que la función is_admin existe y es segura
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica si el usuario existe en user_profiles con rol 'admin'
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que la tabla user_profiles tiene la estructura correcta
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS en user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Política de lectura básica (cada usuario ve su perfil)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- 5. Asegurar que los usuarios administradores tengan el rol correcto
-- Inserta si no existe, actualiza si existe
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email IN ('jeremias.galdames@grupohuentala.com.ar', 'jereegaldames@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Confirmación
SELECT * FROM public.user_profiles WHERE role = 'admin';
