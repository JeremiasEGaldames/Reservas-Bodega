# Bodega Reservas - Sistema de Gestión de Reservas

Aplicación web para la gestión de reservas de una bodega, construida con Next.js y Supabase.

## Requisitos Previos

- Node.js (v18 o superior recomendado)
- Cuenta en Supabase (o acceso a una instancia PostgreSQL compatible)

## Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/JeremiasEGaldames/reservas-bodega-urbana.git
    cd reservas-bodega-urbana
    ```
    (Ajusta el nombre de la carpeta según corresponda a tu descarga)

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

## Configuración

### 1. Variables de Entorno

Copia el archivo de ejemplo para crear tu configuración local:

```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tua_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 2. Base de Datos

Para inicializar la base de datos con las tablas y funciones necesarias:

1.  Ve al Panel de Control de Supabase.
2.  Abre el **Editor SQL**.
3.  Copia y pega el contenido del archivo `FULL_DATABASE_SETUP.sql` ubicado en la raíz del proyecto.
4.  Ejecuta el script.

Este script creará las tablas `disponibilidad` y `visitas`, configurará las políticas de seguridad (RLS) y cargará disponibilidad inicial para los próximos 90 días.

## Ejecución

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

- **Panel de Administración:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Vista de Usuario (Reservas):** [http://localhost:3000/](http://localhost:3000/)

## Estructura del Proyecto

- `app/`: Rutas y páginas de la aplicación (Next.js App Router).
- `components/`: Componentes reutilizables.
- `lib/`: Utilidades y cliente de Supabase.
- `public/`: Archivos estáticos.
