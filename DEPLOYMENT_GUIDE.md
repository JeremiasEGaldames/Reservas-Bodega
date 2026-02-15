# Guía de Despliegue: GitHub y Supabase

Esta guía te llevará paso a paso para subir tu proyecto a GitHub y conectarlo correctamente con un proyecto de Supabase.

## 1. Preparación de Git y GitHub

### Verificar `.gitignore`
Asegúrate de que tu archivo `.gitignore` incluya las siguientes líneas para no subir secretos ni archivos innecesarios:
```plaintext
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
/node_modules
/.pnp
.pnp.js

# Next.js
/.next/
/out/
/build

# Vercel
.vercel
```
*Ya hemos verificado que tu `.gitignore` actual es correcto.*

### Inicializar Repositorio (Si no lo has hecho)
Abre tu terminal en la carpeta del proyecto y ejecuta:

1.  **Inicializar Git**:
    ```bash
    git init
    ```
2.  **Agregar archivos**:
    ```bash
    git add .
    ```
3.  **Primer Commit**:
    ```bash
    git commit -m "Initial commit: Bodega Reservas App"
    ```

### Subir a GitHub
1.  Ve a [GitHub.com](https://github.com/new) y crea un **nuevo repositorio** (puedes llamarlo `bodega-reservas`).
2.  **No** inicialices con README, .gitignore o licencia (ya los tienes).
3.  Copia los comandos que te da GitHub para "push an existing repository from the command line":
    ```bash
    git remote add origin https://github.com/TU_USUARIO/bodega-reservas.git
    git branch -M main
    git push -u origin main
    ```

## 2. Conexión con Supabase

### Crear Proyecto en Supabase
1.  Ve a [Supabase Dashboard](https://supabase.com/dashboard).
2.  Haz clic en **New Project**.
3.  Selecciona tu organización.
4.  Nombre: `Bodega Reservas`.
5.  Database Password: **Guárdala muy bien**, la necesitarás.
6.  Region: Elige la más cercana a tus usuarios (ej. Sao Paulo).
7.  Haz clic en **Create new project**.

### Configurar Variables de Entorno
1.  Una vez creado el proyecto, ve a **Project Settings** (icono de engranaje) -> **API**.
2.  Copia la `Project URL` y la `anon` public key using.
3.  En tu archivo `.env.local` (localmente) y en las variables de entorno de tu proveedor de hosting (Vercel/Netlify), configura:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=tu_url_del_proyecto
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
    ```

### Sincronizar Base de Datos
Si tienes un archivo SQL con tu esquema (como `FULL_DATABASE_SETUP.sql`), puedes correrlo en el **SQL Editor** de Supabase para crear tus tablas (`visitas`, `disponibilidad`, etc.).

1.  Ve al **SQL Editor** en la barra lateral de Supabase.
2.  Haz clic en **New Query**.
3.  Copia el contenido de `FULL_DATABASE_SETUP.sql`.
4.  Haz clic en **Run**.

## 3. Verificación de Seguridad (RLS)
Es **CRÍTICO** activar Row Level Security (RLS) para proteger tus datos.

1.  Ve a **Table Editor**.
2.  Para cada tabla (`visitas`, `disponibilidad`):
    - Haz clic en la tabla.
    - Si ves un aviso "RLS is not enabled", haz clic para activarlo.
3.  Ve a **Authentication** -> **Policies** para crear reglas específicas (ej. permitir lectura pública pero escritura solo a admins).

## 4. Despliegue en Vercel (Opcional pero recomendado)
1.  Ve a [Vercel](https://vercel.com).
2.  Importa tu repositorio de GitHub.
3.  En **Environment Variables**, agrega las mismas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4.  Haz clic en **Deploy**.

¡Listo! Tu aplicación debería estar online y segura.
