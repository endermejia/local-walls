# Roca Nostra

A modern climbing guide application built with Angular 20 that helps climbers discover and navigate climbing locations.
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

- [Angular 20](https://github.com/angular/angular-cli)
  - SSR (Server-Side Rendering)
  - Zoneless change detection
  - Signals for state management
- [Taiga UI](https://taiga-ui.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)

## Next Steps

- **Agregar subida de fotos al ascent**
- **Cuando se borre un ascent, debe borrar la foto del ascent**
- **Cuando se borra un topo, debe borrar las fotos del topo**
- **Gestionar subscriptions en la app**
- **Corregir errores en console de la app**

## Future Features

- **8a.nu Integration**:
  - Copy 8a.nu ascents database.
  - Direct data import using 8a.nu user credentials.
- **Full Offline Support & Service Worker Configuration**:
  - Optimize `ngsw-config.json` for aggressive caching of core app assets.
  - Implement an `OfflineService` to track connectivity and notify users.
  - Develop a data persistence strategy (e.g., IndexedDB) for offline route browsing and ascent logging.
  - Implement Background Sync for queued offline actions (likes, comments, ascents).
  - Enable map tile caching for offline navigation in climbing areas.

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
npm run serve:ssr:local-walls
```

## Politicas RLS (Row Level Security)

Para garantizar la privacidad de los usuarios con perfil privado, es necesario actualizar las políticas de seguridad en Supabase.

### Tabla `route_ascents`

La política de `SELECT` debe restringir el acceso si el usuario propietario del encadene tiene el perfil privado (`private = true`), a menos que el solicitante sea el propio usuario.

Ejemplo de expresión para la política `SELECT`:

```sql
((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM user_profiles WHERE ((user_profiles.id = route_ascents.user_id) AND (user_profiles.private IS NOT TRUE)))))
```

## Contributing

This repo runs Prettier automatically before each commit via Husky + lint-staged.

---

With love, by Gabri Mejía ❤

[Live DEMO](https://local-walls.vercel.app) 🚀
