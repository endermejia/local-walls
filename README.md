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

## Future Features

- **Sección indoor**:
  - Vias, ascents y croquis en los centros
    - tablas indoor-centers, indoor-routes, indoor-ascents, indoor-ascent-comments, indor-ascent-likes, indor-ascent-comment-likes, indoor-topos, ...
    - reutilizar componentes de ascent
    - crear paginas:
      - indoor-center
        - comprar bonos
        - ver topos del centro (activos y pasados, por defecto solo activos, debemos poder filtrar por fecha)
        - ver rutas del centro
        - ver ascents del centro
      - indoor-route
      - indoor-topo
        - el topo debe tener fecha inicio y fecha fin
        - debemos poder subir fotos en un topo
        - debemos poder consultar los topos por fecha
  - Indoor-center-admins (por rls solo pueden editar sus centros):
    - Gestion de bonos, informacion del centro, topos, rutas, etc.
    - Gestion de administradores para los centros
    - Opciones de contabilidad, etc
    - Con el modo editar verá el cog en el navbar para ir a /indoor/admin
- **Notificaciones en segundo plano**:
  - Debemos poder recibir notificaciones cuando la app está en segundo plano (por ejemplo, cuando alguien comenta una foto que hemos subido, nos envia un mensaje, etc)
- **8a.nu Integration**:
  - Copy 8a.nu ascents database.
  - Direct data import using 8a.nu user credentials.

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
npm install
npm start
```

### SSR Testing

```bash
npm run build
npm run serve:ssr:climbeast
```

## Contributing

This repo runs Prettier automatically before each commit via Husky + lint-staged.

---

With love, by Gabri Mejía ❤

[Live DEMO](https://climbeast.com) 🚀
