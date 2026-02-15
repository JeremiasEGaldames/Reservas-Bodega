---
name: debug_network_fetch
description: Analizar por qué las peticiones a Supabase fallan con 'Failed to fetch'
---

# Pasos para depurar errores de 'Failed to fetch' en Supabase

Sigue estos pasos sistemáticamente para identificar la causa del error.

1.  **Revisar los logs de la consola del navegador**
    - Examina los logs de la consola del navegador en busca de errores de red o excepciones JavaScript.
    - Busca mensajes de error específicos relacionados con la petición fallida.

2.  **Verificar el código de estado HTTP**
    - Si hay una respuesta, revisa el código de estado:
        - **403 Forbidden**: Indica problemas de permisos, probablemente relacionados con las políticas de Row Level Security (RLS) en Supabase.
        - **401 Unauthorized**: Indica que la API Key es inválida o falta, o el token de autenticación ha expirado.
        - **404 Not Found**: Indica que la tabla o el recurso solicitado no existe.
        - **500 Internal Server Error**: Error en el servidor de Supabase o en una Edge Function.

3.  **Verificar la URL de la petición**
    - Compara la URL a la que se está haciendo la petición con la variable de entorno `NEXT_PUBLIC_SUPABASE_URL`.
    - Asegúrate de que la URL esté bien formada y apunte al proyecto correcto.

4.  **Emitir un informe**
    - Genera un informe detallado que incluya:
        - La causa exacta del problema identificada en los pasos anteriores.
        - La solución recomendada para corregir el error (ej. ajustar políticas RLS, corregir API Key, verificar nombre de tabla).
