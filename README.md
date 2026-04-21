# ClimBeast

A modern climbing guide application built with Angular 21 that helps climbers discover and navigate climbing locations.
The app features an interactive map interface for exploring climbing spots, detailed route information, and mobile-friendly design.
It uses server-side rendering (SSR) for improved performance and SEO, and implements a fully reactive architecture with Angular Signals for state management.

## Features

- 🗺️ Interactive map with climbing locations
- 📱 Mobile-first responsive design
- 🚀 Fast loading with SSR and lazy loading
- 🔍 Search and filter climbing spots
- 📍 Geolocation support
- 🌐 Multilingual support
- 📶 Progressive Web App (PWA) with offline support

## Tech Stack

- [Angular 21](https://github.com/angular/angular-cli)
  - SSR (Server-Side Rendering)
  - Zoneless change detection
  - Signals for state management
- [Taiga UI](https://taiga-ui.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)

## Next Steps

- **Seccion merchandising**
  - Packs de áreas
    - Al comprar un pack se desbloquea el acceso a las áreas del pack, del mismo modo que con las donaciones (revisar como se hace por si hay que hacer cambios. revisar historial de donaciones de user-profile-config)
  - Artículos
    - Administrar artículos y stock por tallas
    - Las compras deben ser por talla y debe gestionarse el stock
    - Boton ver historial de compras en user-profile-config y en el botón menu del navbar
  - Admin
    - Gestionar pedidos, estado envio, etc
  - **Dejar de usar starting_climbing_year, crear signal con api resource en global-data usando el año del primer ascent registrado por el usuario y si no, usar starting-climbing-year como default. **

## Future Features

- **Cambiar ascent-form dependiendo del climbing_kind**:
  - Si es boulder deben aparecer los campos de "boulder" en vez de los de "sport"
- **8a.nu Integration**:
  - Copy 8a.nu ascents database.
  - Direct data import using 8a.nu user credentials.

## 🧗 Sección Indoor (Próxima fase)

Esta sección detalla la hoja de ruta para la implementación de los centros de escalada indoor, incluyendo la gestión administrativa completa y la experiencia del usuario.

### 1. 🗄️ Base de Datos y Almacenamiento

Para habilitar la gestión comercial y de usuarios, es necesario añadir las siguientes tablas y configurar el almacenamiento:

#### Tablas en Supabase:

- **`indoor_vouchers`**: Definición de tipos de bonos (10 sesiones, mensual, anual, trimestral).
  - Campos: `id`, `center_id`, `name`, `price`, `sessions_count` (null si es tiempo), `duration_days`, `active`.
- **`indoor_voucher_purchases`**: Registro de compras de bonos por usuarios.
  - Campos: `id`, `user_id`, `voucher_id`, `purchase_date`, `expiration_date`, `remaining_sessions`, `status` (active/expired/exhausted).
- **`indoor_voucher_usage`**: Historial de uso de cada bono (check-ins).
  - Campos: `id`, `purchase_id`, `usage_date`.
- **`indoor_sales`**: Registro general de ventas (entradas de día, material de alquiler, magnesio, etc.).
  - Campos: `id`, `center_id`, `user_id` (opcional), `item_name`, `amount`, `category`, `payment_method`, `created_at`.
- **`indoor_inventory`**: Gestión simple de stock para productos (magnesio, pies de gato, camisetas del centro).
  - Campos: `id`, `center_id`, `item_name`, `stock_quantity`, `price`.

#### 📦 Almacenamiento (Storage Buckets):

En este proyecto, los archivos binarios (imágenes) se guardan en **Buckets**. Para mantener la consistencia con el resto de la app (como en `topo-form.ts`), no usaremos una tabla intermedia de fotos a menos que se requiera una galería. La URL o el path del bucket se guarda directamente en la propiedad `image_url` (o `photo`) de la tabla correspondiente.

Se requieren los siguientes buckets:

- **`topos`** (existente): Se usará tanto para roca como para indoor. El path se guarda en `indoor_topos.image_url`.
- **`indoor-centers`**: Para avatares y fotos de las instalaciones del centro. El path se guarda en `indoor_centers.avatar_url` (nuevo campo) o dentro de `contact_info` (Json).
- **`indoor-assets`**: Para imágenes de artículos de la tienda o iconos de bonos.

> **Nota sobre la simplificación**: Siguiendo el patrón de `topo-form`, eliminamos la necesidad de la tabla `indoor_topo_photos`. El proceso de subida obtiene la URL firmada y actualiza directamente el campo en `indoor_topos`. Esto simplifica la lógica de los formularios y mantiene la coherencia visual y técnica.

### 2. 🏗️ Componentes de Angular a Crear

- **Administración (`/src/pages/indoor/admin`)**:
  - `IndoorAdminDashboard`: Vista general con métricas rápidas (ventas hoy, usuarios activos).
  - `IndoorUserManagement`: Buscador de usuarios del centro, visualización de sus bonos activos e historial de compras.
  - `IndoorVoucherEditor`: CRUD para los tipos de bonos que ofrece el centro.
  - `IndoorSalesPanel`: Interfaz de "punto de venta" (POS) simplificada para registrar ventas rápidas en mostrador.
  - `IndoorAccountingView`: Tablas y gráficos de balances, exportación a CSV/PDF.
- **Usuario (`/src/pages/indoor/center-detail`)**:
  - `IndoorVoucherCard`: Componente para mostrar el estado del bono actual del usuario (sesiones restantes, fecha fin).
  - `IndoorVoucherStore`: Lista de bonos disponibles para compra online.
  - `IndoorCheckInHistory`: Listado de días que el usuario ha asistido al centro.

### 3. 🛠️ Funcionalidades Clave

#### Para Administradores de Centros:

- **Gestión de Usuarios**: Poder ver el perfil de escalador de sus clientes y su fidelidad.
- **Validación de Bonos**: Sistema rápido para "picar" una sesión cuando el usuario llega al mostrador.
- **Contabilidad y Balances**: Filtros por fecha para ver ingresos, desglose por método de pago y categoría de producto.
- **Historial de Ventas**: Poder anular o corregir ventas erróneas.
- **Gestión de Administradores**: El dueño del centro puede añadir otros usuarios como administradores con diferentes permisos (ej: solo ventas, o administración total).

#### Para Usuarios (Escaladores):

- **Dashboard Personal Indoor**: Ver cuántas sesiones le quedan en su bono de 10 o cuándo caduca su mensualidad.
- **Notificaciones**: Avisos cuando un bono está a punto de caducar o le quedan pocas sesiones.
- **Compra Online**: Poder renovar el bono directamente desde la app (integración con Stripe).
- **Filtro Indoor**: Integración total en el mapa y feed de la app para descubrir centros y ver sus rutas actuales.

---

## Navigation

The application uses a responsive navigation system that adapts to the device's screen size. On desktop, it features a collapsible sidebar, while on mobile, it transitions to a bottom navigation bar.

### Core Sections

- **🏠 Home**: Personalized dashboard with recent activity and updates.
- **🗺️ Explore**: Interactive map for discovering climbing spots with advanced filtering (grade, style, shade, etc.).
- **📜 Areas**: A comprehensive list view of all climbing areas for quick access.
- **⚙️ Admin / My Areas**: Management panel for administrators and equippers to curate crag data.
- **👤 User Profile**: Access to your logbook, personal statistics, and account settings.

### Content Hierarchy

- **Area Details**: Overview of a climbing region, including its crags and general info.
- **Crag Details**: Detailed view of a specific sector, featuring route lists, grade charts, and approach info.
- **Topo Viewer**: Interactive topo images with route overlays for precise navigation.
- **Route Details**: Technical specifications, grade distribution, and user ascent history.

## PWA & Service Worker

The app is configured as a PWA using Angular Service Worker. It provides:

- Offline caching of the app shell and static assets.
- Installable manifest for mobile and desktop.

## Development

### Prerequisites

- Node.js & npm
- Supabase account (for database and auth)

### Local Setup

```bash
bun install
bun start
```

### SSR Testing

```bash
bun run build
bun run serve:ssr:climbeast
```

## Contributing

This repo runs Prettier automatically before each commit via Husky + lint-staged.

---

With love, by Gabri Mejía ❤

[ClimBeast](https://climbeast.com) 🚀
