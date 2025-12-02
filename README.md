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
