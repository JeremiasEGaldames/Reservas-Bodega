-- ============================================================
-- SECURITY_FIX.sql
-- Correcciones de seguridad para el sistema de reservas
-- Ejecutar en Supabase SQL Editor EN ORDEN
-- ============================================================

-- ============================================================
-- PASO 0: AGREGAR COLUMNAS FALTANTES (si no existen)
-- ============================================================
DO $$ 
BEGIN
  -- Agregar columna 'idioma' a disponibilidad si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'disponibilidad' AND column_name = 'idioma'
  ) THEN
    ALTER TABLE public.disponibilidad ADD COLUMN idioma VARCHAR(20) NOT NULL DEFAULT 'Español';
    -- Recrear el constraint UNIQUE incluyendo idioma
    ALTER TABLE public.disponibilidad DROP CONSTRAINT IF EXISTS disponibilidad_fecha_hora_idioma_key;
    ALTER TABLE public.disponibilidad DROP CONSTRAINT IF EXISTS disponibilidad_fecha_hora_key;
    ALTER TABLE public.disponibilidad ADD CONSTRAINT disponibilidad_fecha_hora_idioma_key UNIQUE (fecha, hora, idioma);
  END IF;

  -- Agregar columna 'comentarios' a visitas si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'visitas' AND column_name = 'comentarios'
  ) THEN
    ALTER TABLE public.visitas ADD COLUMN comentarios TEXT;
  END IF;
END $$;

-- ============================================================
-- PASO 1: CREAR TABLA user_profiles (Sistema de Roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger para crear perfil automáticamente al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar perfiles para usuarios existentes (si no existen)
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS RLS EXISTENTES
-- ============================================================

-- Disponibilidad: eliminar TODAS las políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'disponibilidad'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.disponibilidad', pol.policyname);
  END LOOP;
END $$;

-- Visitas: eliminar TODAS las políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visitas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.visitas', pol.policyname);
  END LOOP;
END $$;

-- user_profiles: eliminar TODAS las políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.policyname);
  END LOOP;
END $$;


-- ============================================================
-- PASO 3: CREAR POLÍTICAS RLS SEGURAS
-- ============================================================

-- ---- DISPONIBILIDAD ----
-- Público (anon): solo puede VER (calendario público)
CREATE POLICY "anon_select_disponibilidad"
  ON public.disponibilidad
  FOR SELECT
  TO anon
  USING (true);

-- Autenticados: SELECT (ver todo, incluso deshabilitados para panel admin)
CREATE POLICY "auth_select_disponibilidad"
  ON public.disponibilidad
  FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados con rol admin: INSERT
CREATE POLICY "admin_insert_disponibilidad"
  ON public.disponibilidad
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Autenticados con rol admin: UPDATE
CREATE POLICY "admin_update_disponibilidad"
  ON public.disponibilidad
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Autenticados con rol admin: DELETE
CREATE POLICY "admin_delete_disponibilidad"
  ON public.disponibilidad
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ---- VISITAS ----
-- Público (anon): solo puede INSERTAR (crear reservas via RPC, pero necesita INSERT para compatibilidad)
CREATE POLICY "anon_insert_visitas"
  ON public.visitas
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Autenticados: SELECT (admin puede ver todas las reservas)
CREATE POLICY "auth_select_visitas"
  ON public.visitas
  FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados: INSERT (admins también pueden crear reservas manuales)
CREATE POLICY "auth_insert_visitas"
  ON public.visitas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Autenticados con rol admin: UPDATE
CREATE POLICY "admin_update_visitas"
  ON public.visitas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Autenticados con rol admin: DELETE
CREATE POLICY "admin_delete_visitas"
  ON public.visitas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ---- USER_PROFILES ----
-- Solo el propio usuario puede ver su perfil
CREATE POLICY "users_select_own_profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins pueden ver todos los perfiles
CREATE POLICY "admin_select_all_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins pueden actualizar roles
CREATE POLICY "admin_update_profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- PASO 4: FUNCIÓN is_admin()
-- Verifica si el usuario actual tiene rol admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Permisos: cualquier rol autenticado puede ejecutarla
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ============================================================
-- PASO 5: FUNCIÓN create_booking_atomic()
-- Reserva atómica con validación server-side y row locking
-- Resuelve race conditions (Problema 2 + 4)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_slot_id BIGINT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_hotel TEXT,
  p_habitacion TEXT,
  p_idioma TEXT DEFAULT 'Español',
  p_comentarios TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_slot RECORD;
  v_visit_id BIGINT;
BEGIN
  -- ===== VALIDACIONES DE CAMPOS =====
  
  -- Nombre obligatorio
  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El nombre es obligatorio.',
      'code', 'MISSING_NAME'
    );
  END IF;

  -- Apellido obligatorio
  IF p_apellido IS NULL OR TRIM(p_apellido) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El apellido es obligatorio.',
      'code', 'MISSING_LASTNAME'
    );
  END IF;

  -- Hotel obligatorio
  IF p_hotel IS NULL OR TRIM(p_hotel) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El hotel es obligatorio.',
      'code', 'MISSING_HOTEL'
    );
  END IF;

  -- Habitación obligatorio
  IF p_habitacion IS NULL OR TRIM(p_habitacion) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La habitación o contacto es obligatorio.',
      'code', 'MISSING_ROOM'
    );
  END IF;

  -- ===== OBTENER SLOT CON LOCK (FOR UPDATE) =====
  -- Esto bloquea la fila hasta que termine la transacción,
  -- evitando race conditions entre usuarios concurrentes.
  SELECT * INTO v_slot
  FROM public.disponibilidad
  WHERE id = p_slot_id
  FOR UPDATE;

  -- Verificar que el slot existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El horario seleccionado no existe.',
      'code', 'SLOT_NOT_FOUND'
    );
  END IF;

  -- ===== VALIDACIONES DE NEGOCIO =====

  -- Rechazar fechas pasadas
  IF v_slot.fecha < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se pueden hacer reservas para fechas pasadas.',
      'code', 'PAST_DATE'
    );
  END IF;

  -- Rechazar slots deshabilitados
  IF NOT v_slot.habilitado THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este horario no está habilitado.',
      'code', 'SLOT_DISABLED'
    );
  END IF;

  -- Verificar disponibilidad de cupos
  IF v_slot.cupos_disponibles <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lo sentimos, no hay cupos disponibles para este horario.',
      'code', 'NO_AVAILABILITY'
    );
  END IF;

  -- ===== OPERACIÓN ATÓMICA: INSERT + UPDATE =====

  -- 1. Insertar la visita
  INSERT INTO public.visitas (
    fecha, hora, nombre, apellido, 
    numero_habitacion, hotel, idioma, 
    comentarios, estado
  )
  VALUES (
    v_slot.fecha,
    v_slot.hora,
    TRIM(p_nombre),
    TRIM(p_apellido),
    TRIM(p_habitacion),
    TRIM(p_hotel),
    COALESCE(TRIM(p_idioma), 'Español'),
    NULLIF(TRIM(COALESCE(p_comentarios, '')), ''),
    'confirmada'
  )
  RETURNING id INTO v_visit_id;

  -- 2. Decrementar cupos disponibles
  UPDATE public.disponibilidad
  SET cupos_disponibles = cupos_disponibles - 1
  WHERE id = p_slot_id;

  -- ===== RETORNO EXITOSO =====
  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'message', 'Reserva confirmada exitosamente.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya existe una reserva idéntica registrada.',
      'code', 'DUPLICATE_BOOKING'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error inesperado al procesar la reserva.',
      'code', 'INTERNAL_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos: tanto anon (público) como authenticated pueden ejecutar
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ============================================================
-- PASO 6: ACTUALIZAR ensure_future_availability
-- (Incluir columna idioma si corresponde)
-- ============================================================
CREATE OR REPLACE FUNCTION ensure_future_availability(days_ahead INT DEFAULT 90)
RETURNS void AS $$
DECLARE
  target_date DATE;
  i INT;
BEGIN
  FOR i IN 0..days_ahead LOOP
    target_date := CURRENT_DATE + i;
    
    -- Insertar slot en Español (19:00)
    INSERT INTO public.disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
    VALUES (target_date, '19:00:00', 'Español', 10, 10, true)
    ON CONFLICT (fecha, hora, idioma) DO NOTHING;

    -- Insertar slot en English (19:00)
    INSERT INTO public.disponibilidad (fecha, hora, idioma, cupos_totales, cupos_disponibles, habilitado)
    VALUES (target_date, '19:00:00', 'English', 10, 10, true)
    ON CONFLICT (fecha, hora, idioma) DO NOTHING;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ensure_future_availability(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_future_availability(INT) TO authenticated;


-- ============================================================
-- PASO 7: CONFIGURACIÓN REALTIME (mantener funcionalidad)
-- ============================================================
DO $$
BEGIN
  -- Habilitar Realtime para disponibilidad 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.disponibilidad;
EXCEPTION WHEN duplicate_object THEN
  -- Ya está habilitado, ignorar
  NULL;
END $$;


-- ============================================================
-- PASO 8: CONFIGURACIÓN INICIAL DE ADMIN
-- ============================================================
-- ⚠️  IMPORTANTE: Ejecutar esta línea UNA VEZ después de todo lo anterior
-- Reemplazar 'TU_EMAIL_AQUI' con el email del primer administrador
--
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'jeremias.galdames@grupohuentala.com.ar';
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'jereegaldames@gmail.com';
--
-- ============================================================

-- Verificar estado final:
-- SELECT * FROM public.user_profiles;
-- SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'public';
