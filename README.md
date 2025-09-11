# Ñasca!

A modern climbing guide application built with Angular 20 that helps climbers discover and navigate climbing locations. The app features an interactive map interface for exploring climbing spots, detailed route information, and mobile-friendly design. It uses server-side rendering (SSR) for improved performance and SEO, and implements a fully reactive architecture with Angular Signals for state management.

## Features

- 🗺️ Interactive map with climbing locations
- 📱 Mobile-first responsive design
- 🚀 Fast loading with SSR and lazy loading
- 🔍 Search and filter climbing spots
- 📍 Geolocation support
- 🌐 Multilingual support

## Future Features

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
    - Climbing route
      - Follow climbing routes, crags and areas
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

## Notes on Server-Side Rendering (SSR)

When running the application with SSR, you may see the following message in the console:

```
Not in browser environment, skipping map initialization
```

This is expected behavior and not an error. The map initialization is intentionally skipped during server-side rendering because map libraries like Leaflet require browser-specific APIs that are not available in the server environment. The map will be properly initialized when the application runs in the browser.
