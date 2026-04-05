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
  - Packs de áreas (por ejemplo pack Costa Blanca, que incluya varias áreas de la zona)
  - Camisetas
  - Sudaderas
  - Pegatinas
  - Magneseras
  - Gorras
  - Cepillos
- **Modificar perfil privado y RLS**
  - Solicitudes de seguimiento para perfil privado
  - Controlar que solo se pueda seguir a usuarios con perfil publico
  - Controlar que no se pueda ver el feed, proyectos, etc de usuarios privados si no los sigues
- **Modificar boton cog en user-profile**
  - Cambiarlo icono COG por MENU y debe abrir opciones como el boton menu del navbar (crea un componente para reutizarlo)
- **Actualizar tour de bienvenida**

## Future Features

- **Sección indoor**:
  - Vias, ascents y croquis en los rocodromos
  - Gestion de bonos y rol de admin para los rocodromos, contabilidad, etc
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
