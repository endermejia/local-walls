# AGENTS.md

## Project

ClimBeast — Angular 21 climbing guide SPA with SSR, zoneless change detection, and Supabase backend. Deployed on Vercel.

## Commands

```bash
bun install          # install deps (uses bun, NOT npm)
bun start            # dev server (SSR off, HMR off by default)
bun run build        # production build (SSR + prerender)
bun run serve:ssr:climbeast  # serve SSR build locally
bun run lint         # eslint (ng lint)
bun run lint:fix     # auto-fix lint issues
bun run test         # karma/jasmine unit tests
bun run format       # prettier on src/
```

Pre-commit hook runs `lint-staged` (prettier only) via Husky. No CI workflows exist.

## Type Generation

Supabase types are generated from the remote project:

```bash
bun run gen:supabase-types
```

This writes to `src/models/supabase-generated.ts`. Never hand-edit that file. Use the typed DTOs from `src/models/supabase-interfaces.ts` instead.

## Key Conventions

- **No `any`** — use proper interfaces, DTOs, or `unknown` with type guards.
- **Zoneless change detection** — do NOT call functions/methods in Angular templates (`@if (fn())`, `{{ fn() }}`). Use `computed()` signals or pure pipes instead. This is a hard performance rule.
- **Component style** — OnPush change detection, inline styles, no tests by default (schematic config in `angular.json`). Component prefix: `app` (kebab-case elements, camelCase attributes).
- **Supabase RLS** — all new tables must have RLS enabled. Policy naming: `auth_can_read`, `own_can_insert`, `own_can_delete`, `admin_can_modify`, etc. Restrict to `authenticated` role when possible.
- **Formatting** — 2-space indent, single quotes in TS, Prettier on commit.
- **i18n** — `@ngx-translate/core`. Check translations with `bun run check:i18n`. Sync with `bun run sync-translations`.

## Structure

- `src/pages/` — route-level components (area, indoor, admin, user, auth, dashboard, marketing, merchandising)
- `src/services/` — all business logic services (Supabase calls, maps, search, etc.)
- `src/models/` — TypeScript interfaces and enums; `supabase-generated.ts` is auto-generated
- `src/components/` — shared/reusable components
- `src/guard/` — route guards (auth, admin, no-auth, root-redirect)
- `src/supabase-context/` — Supabase client initialization
- `supabase/functions/` — Edge functions (Stripe, push notifications)
- `supabase/migrations/` — database migrations

## Gotchas

- Tailwind CSS 4 (not 3) — configured via `@tailwindcss/vite` plugin, not the old PostCSS approach.
- `canvas` is an external dependency for SSR builds (configured in `angular.json`).
- `.npmrc` sets `legacy-peer-deps=true` — peer dep conflicts are expected and suppressed.
- Vercel output directory is `dist/climbeast/browser` (not `dist/climbeast`).
- Leaflet uses an alpha version (`2.0.0-alpha.1`) — check for API differences from stable.
