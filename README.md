# Angular20
Base project for Web Applications:
- [Angular 20](https://github.com/angular/angular-cli)
  - SSR
  - Zoneless
  - OnPush and Standalone components
  - GlobalService using Signals
- [Taiga UI](https://taiga-ui.dev/), with mobile first templates
- [Tailwind 4](https://tailwindcss.com/)
- ESLINT

With love, by Gabri Mejía ❤

[Live DEMO](https://gabri-mejia.netlify.app/home) 🚀

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

This repo runs the formatter automatically before each commit via a Git pre-commit hook.

How to enable locally:
- Ensure dependencies are installed: `npm install` (this runs the `prepare` script that sets up Husky).
- Husky will execute `.husky/pre-commit`, which runs `npm run format`.

Notes:
- You can run the formatter manually with `npm run format`.
- If you had installed dependencies before this change, run `npm run prepare` once to install Git hooks.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deploying to Netlify

This project is configured for SSR on Netlify using the official Netlify Angular Runtime.

Steps:
- Connect this repository to Netlify.
- Ensure the build command is: `npm run build`.
- Publish directory: `dist/angular20/browser`.
- Netlify will detect `@netlify/angular-runtime` from `netlify.toml` and configure SSR automatically.

Notes:
- No custom redirects are needed; the plugin manages them for SSR and CSR fallback.
- The server bundle is built to `dist/angular20/server` by Angular.

## Notes on Server-Side Rendering (SSR)

When running the application with SSR, you may see the following message in the console:

```
Not in browser environment, skipping map initialization
```

This is expected behavior and not an error. The map initialization is intentionally skipped during server-side rendering because map libraries like Leaflet require browser-specific APIs that are not available in the server environment. The map will be properly initialized when the application runs in the browser.
