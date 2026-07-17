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

- **✨ Mejora del Menú de Perfil (UX)**:
  - Modificar la vista de perfil. El boton **Perfil del navbar** por dropdown con iconos.
  - Centralizar accesos directos: Mis sectores, Logbook, Configuración y botones del `menu-button`.
- **🛡️ Sistema de Gestión de Permisos y Solicitudes**:
  - **Administradores de Áreas**: Refinar el flujo en `AdminAreaRequestsComponent`. Implementar notificaciones push al aprobar/rechazar.
  - **Relación con Equippers**: Crear un flujo para que los usuarios soliciten vincularse a un "Equipper" oficial, permitiendo la atribución correcta de nuevas vías.
  - **Validación por Roles**: Asegurar que las RLS de Supabase y los Guards de Angular cubran los nuevos estados de "pendiente de validación".
- **📊 Integración Avanzada con 8a.nu**:
  - Implementar la importación directa de ascensos usando las credenciales del usuario (vía `EightAnuService`).
  - Sincronización automática de bases de datos: mapeo inteligente de sectores y vías entre ClimBeast y 8a.nu.
  - Visualización de estadísticas comparativas (grado medio, pirámide de ascensos).

## Future Features

- **🗓️ Planificador de Viajes Inteligente**:
  - Filtros meteorológicos: Integración con API de clima para sugerir sectores donde no llueva en las fechas seleccionadas.
  - Filtros por grado y estilo: Algoritmo de recomendación basado en el logbook del usuario y de sus acompañantes.
  - Generación de itinerarios exportables y compartibles.
- **🏋️ Ecosistema de Entrenamiento**:
  - **Calendario y Planificación**: Interfaz tipo drag-and-drop para organizar sesiones de fuerza, resistencia y técnica.
  - **Modo Ejecución**: Temporizadores específicos para series (Beastmaker, suspensiones) y fases de entrenamiento.
  - **Red de Entrenadores**: Marketplace o sistema de vinculación donde entrenadores pueden asignar rutinas a sus alumnos y monitorizar progresos.
  - **Analíticas**: Gráficos de carga de entrenamiento y fatiga.
- **🧗 Sección Indoor (Gestión de Rocódromos)**:
  - Implementar la hoja de ruta detallada abajo para centros de escalada.
  - Sistema de check-in mediante QR y gestión de bonos en tiempo real.

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
