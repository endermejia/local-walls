# Roca nostra

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

## Navigation

- ### Login/Register page
  - Form with email and password fields
  - Reset password button (sends magic link or reset email)
  - Signup / Signin buttons
  - Error and success toasts with accessible messages
  - Link to privacy policy and terms
  <!-- Possible: Social login providers (Google, Apple) -->

- ### Navbar
  - Button menu with page links (Explore, Areas, Profile, Login)
  - Breadcrumbs synced with router, SSR-safe
  - Search bar: search areas, crags, routes, and users with typeahead
  - Locale selector (ES/EN)
  - Compact layout on mobile; collapsible drawer on small screens

- ### App header section
  - Go back button
  - Section title
  - Like button (non-toggle for lists; toggle on detail when authenticated)
  - Share button (uses Web Share API on browser only)
  <!-- Possible: Offline badge when HTTP transfer cache serves stale data -->

- ### Profile page
  - Info section (only editable by user owner. edit button is hidden for anonymous users)
    - Edit button toggle inputs to edit mode
    - Update with any change in the user profile.
    - Example with <tui-input-inline
      ```
      @if (editing()) {
        <tui-input-inline>
          Type a heading
          <input tuiAutoFocus [(ngModel)]="heading" (blur)="onBlur()" (keydown.enter.prevent)="toggle()"/>
        </tui-input-inline>
      } @else {
        <span>{{ heading }}</span>
        <button appearance="icon" iconStart="@tui.pencil" size="xs" tuiIconButton type="button" class="tui-space_left-1" (click)="toggle()">
          Edit heading
        </button>
      }
      ```
    - Name
    - Email (not editable)
    - Avatar

      ```
          import {AsyncPipe, NgIf} from '@angular/common';
          import {ChangeDetectionStrategy, Component} from '@angular/core';
          import {FormControl, ReactiveFormsModule} from '@angular/forms';
          import {type TuiFileLike, TuiFiles} from '@taiga-ui/kit';

          @Component({
          standalone: true,
          exportAs: "Example6",
          imports: [AsyncPipe, NgIf, ReactiveFormsModule, TuiFiles],
          templateUrl: './index.html',
          changeDetection: ChangeDetectionStrategy.OnPush,
          })
          export default class Example {
          protected readonly control = new FormControl<TuiFileLike | null>(null);

              protected removeFile(): void {
                  this.control.setValue(null);
              }
          }

          // TODO: replace *ngIf with @if
          <label *ngIf="!control.value" tuiInputFiles>
            <input
                accept="image/*"
                capture="user"
                title="Choose files (no limits)"
                tuiInputFiles
                [formControl]="control"
            />
          </label>

          <tui-files class="tui-space_top-1">
            <tui-file
                *ngIf="control.valueChanges | async as file"
                [file]="file"
                (remove)="removeFile()"
            />
          </tui-files>

      ```

    - Settings section
      - Language selector (remove option from globalData.drawer)
      - Theme selector (remove option from globalData.drawer)
      - Change the password button
      - Logout button (remove option from globalData.drawer)

  - Ascents section
    - Routes and boulders tabs
    - List of ascents
      - Columns: date, grade, rating, comment, photo
      - Sorting by date or grade
      - Edit ascent button (only user owner)
      <!-- Possible: Public profile toggle and vanity URL -->

- ### Equipper profile page
  - Name, bio, avatar
  - Settings section (only equipper related or admin)
    - Edit profile button
  - Assigned crags list (only admin can edit this list)
  - Equipped routes list

- ### Explore page
  - Map
    - Current location
    - Zoom controls
    - Filter button (grade range, climb type, shade, approach)
  - Bottom sheet
    - List of climbing areas and crags filtered by map bounds and filter
    - Quick actions: open detail, start navigation, like (if authenticated)

- ### Areas list page
  - Search bar and filter button
  - New area button (only admin)
  - List of areas (sorted by likes / name)
    - Click to view 'Area detail page'
    - Like indicator not togglable
    - Chart routes by grades (aggregated for the area)

- ### Area detail page
  - App header section
  - Edit/delete area button (only admin)
  - Chart routes by grades (of selected area)
  - New crag button (only admin or equipper owner)
  - List of crags (sorted by likes / name)
    - Click to view 'Crag detail page'
    - Like indicator not togglable

- ### Crag detail page
  - App header section
  - Edit/delete crag button (only admin or equipper owner)
  - Chart topo by grades (of selected crag)
  - Tabs
    - Routes
      - New route button (only admin or equipper owner)
      - Table of routes (editable only admin or equipper owner)
    - Topos
      - New topo button (only admin or equipper owner)
      - List of topos (sorted by likes / name)
      - Like indicator not togglable

- ### Topo detail page
  - App header section with title and actions (edit/delete if authorized)
  - Image viewer with pinch-zoom and pan
  - Route overlays with numbers matching the route table
  - Toggle overlays visibility and opacity
  - Shade information (morning/afternoon + switch hour)
  - Link to related routes and crag
  - Like button and share

- ### Route detail page
  - App header section with route name and like button
  - Main info: grade, height, pitches, climb kind, orientation
  - Quality/UI rating (stars) and popularity
  - Equippers and first ascent info
  - Links to crag and related topo(s)
  - Map snippet with exact location (browser-only)
  - Ascents list (user ticks) with filters and stats
  - Log ascent button (authenticated users)

- ### Add/edit area dialog
  - Form fields: name, slug, description (per locale)
  - Validation: required, unique slug, length limits
  - Submit/Cancel with optimistic UI
  <!-- Possible: Slug auto-generation with transliteration -->

- ### Add/edit crag dialog
  - Form fields: name, slug, area selector, description/warnings, location (lat/lng)
  - Validation: required, coordinate bounds, unique per area
  - Map picker for coordinates (client-only, with SSR guard)
  - Assign equippers (admin/equipper owner)
  <!-- Possible: Approach time and parking suggestions -->

- ### Add/edit topo dialog
  - Form fields: name, photo upload, shade options, switch hour
  - Drag-and-drop to place and order route numbers over the image
  - Link existing routes to this topo
  - Preview of overlays before save
  <!-- Possible: Auto-detect lines from image using simple helpers -->

- ### Add/edit route dialog
  - Form fields: name, slug, grade, height, pitches, climb kind, equippers
  - Validation with grade schema
  - Optional GPS point selection
  - Link to topo (optional)
  <!-- Possible: Import from CSV for bulk creation (admin) -->

- ### Add/edit ascent dialog
  - Form with fields for ascent date, style, grade opinion, rating, comment, photo
  - Mark as flash/onsight/redpoint, attempts, and partner(s)
  - Privacy control (public/private)
  <!-- Possible: Attach media gallery and GPX track -->

- ### Table routes component
  - Columns
    - Name
    - Grade
    - Height
    - Equippers
    - Pitches
  - Pagination (client/server)
  - Sorting by name, grade, height
  - Column filters (grade range, climb kind)
  - Editable signal input (when allowed)
  - On-click cell/row actions (outputs a signal)
  - Keyboard navigation and accessible row actions
  <!-- Possible: Export visible rows to CSV -->

## Data tables and RLS

This app uses a Postgres schema (Supabase-compatible) optimized for public read access and user-owned writes. Below is an overview of the main tables plus recommended Row Level Security (RLS) policies.

Notes

- The following DDL is informational. Some keys are composite for data integrity and uniqueness; adapt if you need simpler natural keys.
- RLS examples assume a Supabase/JWT setup where `auth.uid()` returns the current user's UUID.
- Public browsing relies on read access for anonymous users; mutations are restricted to authenticated users and, when applicable, only for their own rows.

Tables overview

- areas: Areas that group crags
  - Columns: id, slug, name, created_at
  - Relationships: crags(area_id) → areas(id)
- crags: Climbing crags within an area
  - Columns: id, slug, name, area*id, description*(es|en), warning\_(es|en), approach, latitude, longitude, climb_kind, created_at
  - Relationships: area_id → areas(id)
- routes: Individual climbing routes within a crag
  - Columns: id, slug, name, grade, crag_id, height, created_at
  - Relationships: crag_id → crags(id)
- topos: Topographic images/metadata for a crag
  - Columns: id, slug, crag_id, name, photo, shade_morning, shade_afternoon, shade_change_hour, created_at
  - Relationships: crag_id → crags(id)
- topo_routes: Join between topos and routes with ordering number
  - Columns: id, route_id, topo_id, number, created_at
  - Relationships: route_id → routes(id), topo_id → topos(id)
- parkings: Parking locations
  - Columns: id, name, latitude, longitude, size, created_at
- crag_parkings: Many-to-many crags ↔ parkings
  - Columns: id, crag_id, parking_id, created_at
  - Relationships: crag_id → crags(id), parking_id → parkings(id)
- equippers: People or groups who equipped routes/crags
  - Columns: id, name, description, photo, created_at
- route_equippers: Many-to-many routes ↔ equippers
  - Columns: id, route_id, equipper_id, created_at
  - Relationships: route_id → routes(id), equipper_id → equippers(id)
- crag_equippers: Many-to-many crags ↔ user_profiles (equippers)
  - Columns: id, crag_id, equipper_id (uuid of user), created_at
  - Relationships: crag_id → crags(id), equipper_id → user_profiles(user_id)
- Likes: Reactions by users
  - area_likes: id, area_id, user_id, created_at
  - crag_likes: id, crag_id, user_id, created_at
  - route_likes: id, route_id, user_id, created_at
  - Relationships: FK to their target table + auth.users(id) for user_id
- User content/state
  - user_profiles: id, user_id (unique), display_name, bio, avatar_url, role, allowed_crag_ids[], created_at, updated_at
  - route_ascents: ascents by user (type: os/rp/f, attempts, soft/hard flags, rate, recommended, first_ascent, comment, private_comment, photo_path, ascent_date)
  - route_projects: user project list

Recommended indexes and constraints

- Add unique partial constraints to prevent duplicate likes per target per user:
  - UNIQUE (area_id, user_id) on area_likes
  - UNIQUE (crag_id, user_id) on crag_likes
  - UNIQUE (route_id, user_id) on route_likes
- Consider btree indexes for common filters:
  - crags(area_id), routes(crag_id), topos(crag_id), topo_routes(route_id), crag_parkings(crag_id)
- For geospatial queries later, consider moving latitude/longitude to PostGIS geometry/geography with GIST indexes.

RLS policies (Supabase-style examples)

Enable RLS on all tables where users write data:

```sql
-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.route_ascents enable row level security;
alter table public.route_projects enable row level security;
alter table public.area_likes enable row level security;
alter table public.crag_likes enable row level security;
alter table public.route_likes enable row level security;
alter table public.crag_equippers enable row level security;

-- Public read for catalog-like tables
create policy "read public areas" on public.areas
  for select using (true);
create policy "read public crags" on public.crags
  for select using (true);
create policy "read public routes" on public.routes
  for select using (true);
create policy "read public topos" on public.topos
  for select using (true);
create policy "read public joins" on public.topo_routes
  for select using (true);
create policy "read public parkings" on public.parkings
  for select using (true);
create policy "read public crag_parkings" on public.crag_parkings
  for select using (true);
create policy "read public equippers" on public.equippers
  for select using (true);
create policy "read public route_equippers" on public.route_equippers
  for select using (true);

-- user_profiles: users can read all profiles, but only manage their own
create policy "read profiles" on public.user_profiles
  for select using (true);
create policy "insert own profile" on public.user_profiles
  for insert with check (user_id = auth.uid());
create policy "update own profile" on public.user_profiles
  for update using (user_id = auth.uid());

-- route_ascents: only owner can insert/update/delete; everyone can read aggregated/public fields
create policy "read ascents" on public.route_ascents
  for select using (true);
create policy "insert own ascent" on public.route_ascents
  for insert with check (user_id = auth.uid());
create policy "update own ascent" on public.route_ascents
  for update using (user_id = auth.uid());
create policy "delete own ascent" on public.route_ascents
  for delete using (user_id = auth.uid());

-- route_projects: only owner can manage
create policy "read projects (own)" on public.route_projects
  for select using (user_id = auth.uid());
create policy "insert own project" on public.route_projects
  for insert with check (user_id = auth.uid());
create policy "update own project" on public.route_projects
  for update using (user_id = auth.uid());
create policy "delete own project" on public.route_projects
  for delete using (user_id = auth.uid());

-- likes: public can read counts; users manage their own like rows
create policy "read likes" on public.area_likes for select using (true);
create policy "insert own area like" on public.area_likes for insert with check (user_id = auth.uid());
create policy "delete own area like" on public.area_likes for delete using (user_id = auth.uid());

create policy "read likes" on public.crag_likes for select using (true);
create policy "insert own crag like" on public.crag_likes for insert with check (user_id = auth.uid());
create policy "delete own crag like" on public.crag_likes for delete using (user_id = auth.uid());

create policy "read likes" on public.route_likes for select using (true);
create policy "insert own route like" on public.route_likes for insert with check (user_id = auth.uid());
create policy "delete own route like" on public.route_likes for delete using (user_id = auth.uid());

-- crag_equippers: users can propose/link themselves to a crag; public can read
create policy "read crag_equippers" on public.crag_equippers for select using (true);
create policy "insert own equipper link" on public.crag_equippers
  for insert with check (equipper_id = auth.uid());
create policy "delete own equipper link" on public.crag_equippers
  for delete using (equipper_id = auth.uid());
```

Optional safeguards

- Add NOT NULL and CHECK constraints as needed for your workflows (e.g., `rate between 1 and 5` in `route_ascents` already covered).
- Consider database triggers to maintain denormalized counters (likes, ascents) if needed by the UI, or compute via views/materialized views.
- For private fields in `route_ascents` like `private_comment`, keep read policy as-is; the client should hide private fields in the UI if they don't belong to the viewer. If you need hard segregation, split private notes into a separate table with owner-only select.

Minimum privileges (Supabase quick checklist)

- anon role: SELECT on read-only tables and likes/ascents for public stats.
- authenticated role: SELECT like anon + INSERT/UPDATE/DELETE on own rows per policies above.
- service role (server): unrestricted for maintenance tasks; bypasses RLS—use carefully.

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
