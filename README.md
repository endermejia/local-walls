# Roca nostra

A modern climbing guide application built with Angular 20 that helps climbers discover and navigate climbing locations. The app features an interactive map interface for exploring climbing spots, detailed route information, and mobile-friendly design. It uses server-side rendering (SSR) for improved performance and SEO, and implements a fully reactive architecture with Angular Signals for state management.

## Features

- 🗺️ Interactive map with climbing locations
- 📱 Mobile-first responsive design
- 🚀 Fast loading with SSR and lazy loading
- 🔍 Search and filter climbing spots
- 📍 Geolocation support
- 🌐 Multilingual support

## Future Features

- Map
  - Filters
    - Sport Climbing / Bouldering
    - Difficulty
    - Morning shade / Afternoon shade / All-day shade
- Roles
  - Admin
  - Equipper
  - User
- User
  - Profile
  - Settings
  - Favorites
  - Ascents
    - Onsight, Flash, RedPoint
    - Photo of the day
    - Grade
  - Followed areas
  - Followed crags
  - Followed routes
  - Followed users
  - Project routes
  - Notifications
  - Activity/Logbook
- Topos
  - List
  - Type:
    - Global (everyone can see it)
    - Payment (everyone can buy it)
      - Contribution for the equipper
    - Secretive (only for equipper and users with invitation)
      - Admin and Equipper can invite users to secretive topos

- Private Database with new Api

## Tech Stack

- [Angular 20](https://github.com/angular/angular-cli)
  - SSR
  - Zoneless
  - OnPush and Standalone components
  - GlobalData using Signals
- [Taiga UI](https://taiga-ui.dev/), with mobile first templates
- [Tailwind 4](https://tailwindcss.com/)
- ESLINT

With love, by Gabri Mejía ❤

[Live DEMO](https://local-walls.vercel.app) 🚀

## Nueva API propia con Supabase (roles, topos y gestión completa)

Este proyecto migrará desde la API de Vertical Life a una base de datos propia en Supabase, manteniendo SSR y modo zoneless. Objetivos:

- Tablas: `areas`, `crags`, `routes`, `topos`, relación `topo_routes`, y `user_profiles` con relaciones de seguimiento (follows).
- Roles y permisos: `admin`, `equipper`, `climber`.
  - admin: crea/edita/borra todo; asigna crags a equipadores (nueva opción “Área” en menú lateral izquierdo).
  - equipper: crea/edita topos en crags asignados; puede incluir rutas existentes o crear nuevas; una misma ruta puede aparecer en varios topos.
  - climber: sólo lectura.
- Botones de edición/creación/eliminación visibles solo con permisos.

Tipos/DTOs ya incluidos en el repo: `src/models/supabase.dto.ts` exporta todos los tipos necesarios (áreas, crags, rutas, topos, perfiles, follows, permisos, etc.).

### Pasos recomendados para implementar

1. Preparación del proyecto

- Instala SDK y CLI (opcional) de Supabase:
  ```bash
  npm i @supabase/supabase-js
  # opcional para desarrollo local de BD
  npm i -D supabase
  ```
- Variables de entorno (añadir a `.env` y a entorno de despliegue):
  - `NG_APP_SUPABASE_URL`
  - `NG_APP_SUPABASE_ANON_KEY`
  - `NG_APP_SUPABASE_SERVICE_ROLE` (solo en servidor/CI para seeds y tareas admin; nunca en cliente)

2. Esquema de base de datos

- Crea las tablas básicas (resumen de campos principales):
  - `areas(id uuid pk, name, slug unique, country_name, country_slug, description, image, season int[], has_bouldering bool, has_sport bool, polygon_geojson jsonb, created_at, updated_at)`
  - `crags(id, name, slug, area_id fk areas, area_name, area_slug, country_name, country_slug, location jsonb, description, category int, created_at, updated_at)`
  - `routes(id, name, slug, crag_id fk, area_id fk, kind, grade jsonb, length_m, pitches, boulder_grade jsonb, orientation, sun_hours, rating_avg, rating_count, description, first_ascent jsonb, is_project bool, created_at, updated_at)`
  - `topos(id, name, slug, crag_id fk, visibility enum('global','paid','secret'), cover_image, notes, price_cents, published bool, created_at, updated_at)`
  - `topo_routes(id, topo_id fk, route_id fk, order_number int, label_override, created_at, updated_at)`
  - `user_profiles(id uuid pk, user_id uuid unique references auth.users, display_name, avatar_url, bio, role enum('admin','equipper','climber'), allowed_crag_ids uuid[], created_at, updated_at)`
  - Follows (opcional, según necesidades inmediatas): `user_follow_areas`, `user_follow_crags`, `user_follow_routes`, `user_follow_users` con `follower_user_id` y la FK correspondiente.

- En `src/models/supabase.dto.ts` tienes los tipos de cliente que reflejan este esquema.

3. Políticas de seguridad (RLS)

- Activa RLS en todas las tablas y define políticas:
  - Lectura: todos los `authenticated` pueden `select` en `areas`, `crags`, `routes` y `topos` con `published = true` o cuando `role = 'admin'`/`'equipper'` y el topo les aplica.
  - Escritura (admin): puede `insert/update/delete` en todas las tablas.
  - Escritura (equipper): puede `insert/update/delete` en `topos` y `topo_routes` únicamente para `crag_id ∈ user_profiles.allowed_crag_ids`. Puede crear rutas nuevas en esos crags.
  - Escritura (climber): no.
  - Follows: el usuario puede gestionar sus propias filas (`follower_user_id = auth.uid()`).

4. Almacenamiento (Storage)

- Crea bucket `topos` para imágenes/recursos de croquis. Reglas:
  - Lectura pública sólo para topos `published` y `visibility ≠ 'secret'` o bien acceso autenticado + autorización para secretos.
  - Escritura: admin y equipper con crag permitido.

5. Cliente Supabase (SSR-safe y zoneless)

- Crea un servicio Angular SSR-safe (p. ej. `SupabaseClientService`) que inicialice el cliente sólo en navegador para funcionalidades que lo requieran, y use claves/servicios en servidor si se necesitan procesos server-side.
- Evita usar `window` directamente; comprueba `isPlatformBrowser` y encapsula accesos a Storage/localStorage, siguiendo la guía SSR del proyecto.

6. UI y permisos

- Las vistas deben consultar el `UserProfileDTO.role` y, si `role = 'equipper'`, filtrar acciones por `allowed_crag_ids`.
- Muestra botones de crear/editar/borrar únicamente si `permissions.canCreate/canEdit/canDelete` (ver tipos en `supabase.dto.ts`).
- Añade una entrada “Nueva Área” en el menú lateral visible sólo para `admin`.

7. Integración con el estado (Signals)

- Usa señales para el `userProfile` y permisos derivados (computed) para habilitar/ocultar acciones.
- Transfer Cache de `HttpClient` ya está configurado; conserva SSR seguro para lecturas.

8. Migración de datos (opcional)

- Mapea campos existentes de los modelos actuales:
  - `ClimbingArea` → `AreaDTO`
  - `ClimbingCrag` → `CragDTO`
  - `ClimbingRoute` → `RouteDTO` (convertir `grades` a `Grade` con `label/system/index`)
  - `ClimbingTopo`/`TopoRoute` → `TopoDTO`/`TopoRouteDTO`
- Si consumes Vertical Life temporalmente, considera `TransferState` para SSR y un proceso de seed inicial hacia Supabase.

9. Roadmap sugerido (orden de implementación)

1) Crear tablas y RLS en Supabase (mínimo viable).
2) Crear bucket `topos` y reglas.
3) Implementar `SupabaseClientService` (SSR-safe) y pruebas básicas de lectura.
4) Pantallas de administración:
   - CRUD de Áreas y Crags (admin).
   - Asignación de crags a equipadores (admin).
5) CRUD de Topos y relación con Rutas (equipper en crags asignados y admin en todos).
6) Lectura pública para climbers (listas, detalle, croquis publicados).
7) Añadir follows y vistas de “seguidos” (opcional).
8) Auditoría de permisos en UI + pruebas e2e básicas.

10. SQL de ejemplo (recorte orientativo)

```sql
create type topo_visibility as enum ('global','paid','secret');
create type app_role as enum ('admin','equipper','climber');

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  role app_role not null default 'climber',
  allowed_crag_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

-- Lectura del propio perfil y perfiles públicos básicos
create policy "read profiles" on public.user_profiles
  for select using (true);

-- Actualización del propio perfil
create policy "update own profile" on public.user_profiles
  for update using (auth.uid() = user_id);
```

Sigue este patrón para el resto de tablas y políticas específicas de admin/equipper.

## Development server

To start a local development server, run:

```bash
npm start
```

This will start the server with Hot Module Replacement (HMR) disabled, which allows `@defer` blocks to work properly with lazy loading.

If you prefer to use HMR (note that this will cause all `@defer` block dependencies to be loaded eagerly), you can run:

```bash
npm run start:hmr
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Desarrollo con Supabase local (opcional)

1. Instala la CLI: `npx supabase init` y `npx supabase start`.
2. Aplica el SQL de esquema: `npx supabase db push` o `db reset` con migraciones.
3. Crea variables `NG_APP_SUPABASE_URL` y `NG_APP_SUPABASE_ANON_KEY` apuntando a tu instancia local.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Pre-commit formatting

This repo runs Prettier automatically before each commit via Husky + lint-staged. Only staged files are formatted and re-staged, so your other unstaged changes are not affected.

How to enable locally:

- Ensure dependencies are installed: `npm install` (this runs the `prepare` script that sets up Husky).
- Husky executes `.husky/pre-commit`, which runs `lint-staged`.

Notes:

- You can run the formatter manually with `npm run format` (formats the entire `src` directory).
- If you had installed dependencies before this change, run `npm run prepare` once to install Git hooks.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deploying to Netlify

This project targets Angular 20 with SSR and does not require the Netlify Angular Runtime plugin.

Steps:

- Connect this repository to Netlify.
- Set Build command: `npm run build`.
- Set Publish directory: `dist/local-walls/browser`.

Notes:

- Netlify automatically detects Angular SSR output (Angular 18+) and serves using the generated server bundle at `dist/local-walls/server/main.server.mjs`.
- Configure redirects/status codes for SSR in `src/app/app.routes.server.ts` using Angular Server Routes (headers + status). Avoid Netlify redirects for SSR paths.

## Progressive Web App (PWA)

This app is configured as a PWA with Angular Service Worker.

How to test locally:

- Development mode (no SW): `npm start` (service worker is disabled in dev to simplify debugging).
- Production build (with SW):
  - `npm run build`
  - Serve the browser output with any static server from `dist/local-walls/browser` over HTTP(S). For SSR locally, use `npm run serve:ssr:local-walls` and open the site in the browser; the SW will register on the client.

Features provided:

- Offline caching of app shell and static assets (icons, i18n, CSS, JS).
- Cache-first for assets; freshness strategy for API calls with small timeout.

Notes:

- Service Worker only runs in the browser. SSR on the server is unaffected.
- Manifest is available at `/manifest.webmanifest` with installable icons.

## Notes on Server-Side Rendering (SSR)

When running the application with SSR, you may see the following message in the console:

```
Not in browser environment, skipping map initialization
```

This is expected behavior and not an error. The map initialization is intentionally skipped during server-side rendering because map libraries like Leaflet require browser-specific APIs that are not available in the server environment. The map will be properly initialized when the application runs in the browser.
