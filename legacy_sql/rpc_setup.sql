-- Trigger function para autogenerar disponibilidad
CREATE OR REPLACE FUNCTION public.handle_new_day_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el día insertado no tiene slot de las 19:00, lo creamos
  INSERT INTO public.disponibilidad (fecha, hora, cupos_totales, cupos_disponibles, habilitado)
  VALUES (NEW.fecha, '19:00:00', 10, 10, true)
  ON CONFLICT (fecha, hora) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Opcional) Trigger que se ejecute periodicamente, o usamos una funcion cron
-- Mejor enfoque: Una funcion RPC que el frontend llame para garantizar que el rango de fechas existe.

CREATE OR REPLACE FUNCTION ensure_future_availability(days_ahead INT DEFAULT 90)
RETURNS void AS $$
DECLARE
  target_date DATE;
BEGIN
  FOR i IN 0..days_ahead LOOP
    target_date := CURRENT_DATE + i;
    
    INSERT INTO public.disponibilidad (fecha, hora, cupos_totales, cupos_disponibles, habilitado)
    VALUES (target_date, '19:00:00', 10, 10, true)
    ON CONFLICT (fecha, hora) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
