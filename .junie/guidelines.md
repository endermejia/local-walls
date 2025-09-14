# Guía del Proyecto (Angular 20, SSR, Zoneless)

Este proyecto está construido con Angular 20, renderizado del lado del servidor (SSR) y sin Zone.js (zoneless). Sigue estas pautas para mantener la coherencia, el rendimiento y la compatibilidad SSR.

## 1) SSR (Server-Side Rendering)

- Proveedores SSR: usa `provideServerRendering()` en `app.config.server.ts` (ya configurado).
- Hidratación en cliente: usa `provideClientHydration(withEventReplay(), withIncrementalHydration())` en `app.config.ts` (ya configurado).
- Universal helpers: se usan `@ng-web-apis/universal` y cargadores específicos para SSR (por ejemplo, `TranslateServerLoader`).
- Acceso a APIs del navegador: nunca accedas directamente a `window`, `document`, `navigator`, `localStorage`, etc. En su lugar:
  - Inyecta `PLATFORM_ID` con `inject(PLATFORM_ID)` y comprueba `isPlatformBrowser(platformId)`.
  - Añade además comprobaciones defensivas: `typeof window !== 'undefined'`.
  - Envuelve librerías sólo de navegador con importaciones dinámicas dentro de bloques que sólo se ejecuten en el cliente.
- Transferencia de estado (opcional): cuando haya fetch costosos en SSR, considera `TransferState` para evitar doble carga en cliente.
- i18n en SSR: en servidor usa un `TranslateLoader` que lea del filesystem; en cliente, `TranslateHttpLoader` vía HTTP (ya implementado en este repo).

### Guía de SSR en Angular: Server and hybrid rendering

- Concepto: Angular soporta una estrategia híbrida que combina SSR (Server), SSG (Prerender) y CSR (Client) por ruta para optimizar UX y SEO.
- Arranque de proyecto:
  - Nuevo proyecto con SSR: `ng new --ssr`.
  - Añadir SSR a proyecto existente: `ng add @angular/ssr`.
  - Nota: Por defecto se prerenderá toda la app y se generará un servidor. Para sitio 100% estático, usa `outputMode: 'static'` en angular.json; para habilitar SSR por ruta, define rutas de servidor con `RenderMode.Server`.
- Ruteo en servidor (app.routes.server.ts):
  ```ts
  import { RenderMode, ServerRoute } from "@angular/ssr";
  export const serverRoutes: ServerRoute[] = [
    { path: "", renderMode: RenderMode.Client }, // CSR
    { path: "about", renderMode: RenderMode.Prerender }, // SSG
    { path: "profile", renderMode: RenderMode.Server }, // SSR
    { path: "**", renderMode: RenderMode.Server },
  ];
  ```
  Integración en `app.config.server.ts`:
  ```ts
  import { provideServerRendering, withRoutes } from "@angular/ssr";
  import { serverRoutes } from "./app.routes.server";
  export const appConfigServer: ApplicationConfig = {
    providers: [provideServerRendering(withRoutes(serverRoutes))],
  };
  ```
  App shell (opcional):
  ```ts
  import { provideServerRendering, withRoutes, withAppShell } from "@angular/ssr";
  providers: [provideServerRendering(withRoutes(serverRoutes), withAppShell(AppShellComponent))];
  ```
- Modos de render (por ruta): `RenderMode.Server`, `RenderMode.Client`, `RenderMode.Prerender`.
  - Server: HTML por petición, excelente SEO; mayor coste servidor.
  - Client: comportamiento Angular por defecto; peor TTI/SEO, menor coste servidor.
  - Prerender: HTML en build, ideal para páginas estáticas; gran rendimiento y cacheable por CDN.
- Cabeceras y status por ruta:
  ```ts
  export const serverRoutes: ServerRoute[] = [
    {
      path: "profile",
      renderMode: RenderMode.Server,
      headers: { "X-My-Custom-Header": "some-value" },
      status: 201,
    },
  ];
  ```
- Redirects:
  - SSR: redirecciones HTTP (301/302) en servidor.
  - SSG: "soft redirects" con `<meta http-equiv="refresh">`.
- Prerender parametrizado (`getPrerenderParams`):
  ```ts
  export const serverRoutes: ServerRoute[] = [
    {
      path: "post/:id",
      renderMode: RenderMode.Prerender,
      async getPrerenderParams() {
        const ids = await inject(PostService).getIds();
        return ids.map((id) => ({ id }));
      },
    },
    {
      path: "post/:id/**",
      renderMode: RenderMode.Prerender,
      async getPrerenderParams() {
        return [
          { id: "1", "**": "foo/3" },
          { id: "2", "**": "bar/4" },
        ];
      },
    },
  ];
  ```
  Importante: `inject` debe usarse sincrónicamente dentro del cuerpo sin `await` previos. Para lógica compleja usa `runInInjectionContext` si aplica.
- Fallback en prerender (`PrerenderFallback`): `Server` (por defecto), `Client`, `None`.
  ```ts
  { path: 'post/:id', renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() { return [{ id: 1 }, { id: 2 }, { id: 3 }]; }
  }
  ```
- Componentes compatibles con servidor:
  - Evitar `window/document/navigator/location` y propiedades específicas de `HTMLElement` en SSR.
  - Si necesitas DOM, ejecuta sólo en navegador con `afterNextRender/afterEveryRender` o comprueba `isPlatformBrowser`.
  ```ts
  import { Component, ViewChild, ElementRef, afterNextRender } from "@angular/core";
  @Component({ selector: "my-cmp", template: `<span #content>{{ ... }}</span>` })
  export class MyComponent {
    @ViewChild("content") contentRef!: ElementRef;
    constructor() {
      afterNextRender(() => {
        console.log(this.contentRef.nativeElement.scrollHeight);
      });
    }
  }
  ```
- Tokens SSR útiles vía DI: `REQUEST`, `RESPONSE_INIT`, `REQUEST_CONTEXT` (serán `null` en build, CSR, SSG y extracción de rutas en dev).
  ```ts
  import { inject, REQUEST } from "@angular/core";
  const req = inject(REQUEST);
  console.log(req?.url);
  ```
- App totalmente estática: en `angular.json` establece `outputMode: 'static'` para generar sólo HTML estático sin servidor Node.
- HttpClient Transfer Cache: por defecto cachea GET/HEAD sin Authorization en SSR y los hidrata en cliente. Puedes ajustar con:
  ```ts
  provideClientHydration(withHttpTransferCacheOptions({ includePostRequests: true }));
  ```
- Servidores:
  - Node.js: usa `@angular/ssr/node` con `AngularNodeAppEngine`, `createNodeRequestHandler`, `writeResponseToNodeResponse`.
  - Otros runtimes: usa `@angular/ssr` con `AngularAppEngine` y `createRequestHandler`.

## 2) Zoneless (sin Zone.js)

- Habilitado con `provideZonelessChangeDetection()` en `app.config.ts`.
- Eventos en plantillas deben usar el sufijo `.zoneless` (ej.: `(scroll.zoneless)="onScroll(...)"`).
- Cambio de detección manual: cuando actualices estado desde callbacks externos, usa señales o `effect()` para notificar a la vista.
- Evita patrones que dependan de Zone.js (p.ej., no confíes en que la vista se actualiza sola tras promesas/tiempos). Usa señales para estado reactivo.

## 3) Sintaxis moderna Angular 20

- Control flow:
  - `@if ... { } @else { }`
  - `@for (item of list; track item.id) { } @empty { }`
  - `@switch (...) { @case (...) { } }`
  - `@defer { } @placeholder { } @loading { } @error { }` para cargas diferidas.
- Standalone y DI moderna: usa `inject(...)` en vez de `constructor` donde sea apropiado.
- Guards/Resolvers/Interceptors funcionales.
- Uso de signals (`signal`, `computed`, `effect`) para estado, y `toObservable`/`toSignal` cuando haga falta interoperar con RxJS.
- Usar input (InputSignal) y output (OutputEmitterRef) en lugar de `@Input()` y `@Output()` para mejorar la compatibilidad con SSR.

## 4) Rutas, división de código y cargas diferidas

- Usa importaciones dinámicas en rutas: `loadComponent: () => import('...').then(m => m.X)` (ya presente en `app.routes.ts`).
- Usa `@defer` en vistas para contenido pesado (ej.: mapas) con placeholders accesibles.
- Nombra y organiza módulos/librerías pesadas para minimizar el JS inicial. Evita cargar librerías de navegador durante SSR.

## 5) Acceso seguro a almacenamiento y APIs del navegador

- Envuelve `localStorage/sessionStorage` en servicios seguros para SSR (este repo expone un servicio `LocalStorage`).
- Antes de acceder, valida entorno navegador con `isPlatformBrowser` y `typeof window !== 'undefined'`.

## 6) i18n

- Cliente: `TranslateHttpLoader` desde `/public/i18n/*.json`.
- Servidor: `TranslateServerLoader` que lee del filesystem (ver `app.config.server.ts`).
- Establece idioma por defecto y permite conmutarlo mediante estado con señales.

## 7) Accesibilidad y UX

- Usa atributos ARIA y roles apropiados (ej.: `role="application"` para mapas, `aria-label` en botones).
- Mantén el foco y navegación por teclado en componentes interactivos (bottom sheets, diálogos, etc.).

## 8) Rendimiento

- Incremental Hydration y Event Replay ya están habilitados; evita mutaciones de DOM fuera de Angular.
- Usa `track` en `@for` para listas.

## 9) Estructura del proyecto

- `/src/pages` — Pantallas de la app (standalone).
- `/src/components` — Componentes de la app (standalone).
- `/src/services` — Servicios/estado (señales, wrappers SSR-safe).
- `/src/models` — Interfaces, tipos y modelos de datos.
- `/src/app` — Configuración core, rutas y raíz.
- `/public` — Estáticos e i18n.

## 10) Desarrollo y SSR local

- Desarrollo SPA: `npm start` (sin SSR).
- Build SSR: `npm run build` y luego `npm run serve:ssr:local-walls` para servir SSR desde `dist/`.
- Verifica siempre que:
  - No hay errores de acceso a `window/document` en servidor.
  - Las vistas hidratan sin errores en cliente.

## 11) Estilo y lint

- Sigue Angular Style Guide (nombres en PascalCase para componentes, sufijos adecuados, coherencia en señales/propiedades).
- Usa ESLint del proyecto (`npm run lint` y `npm run lint:fix`).

## 12) Netlify SSR y Redirects (Angular Router)

- Netlify: en SSR las redirecciones definidas en `_redirects` o `netlify.toml` NO se aplican porque SSR usa Edge Functions que corren antes de evaluar redirects. Debes usar redirecciones del enrutador de Angular en los server routes. Fuente: Netlify “Redirects on SSR”.
- Redirecciones SSR con Angular (server routes):

  ```ts
  // src/app/app.routes.server.ts
  import { RenderMode, ServerRoute } from "@angular/ssr";
  export const serverRoutes: ServerRoute[] = [
    // Redirección HTTP desde raíz a /home en SSR
    { path: "", headers: { Location: "/home" }, status: 302 },

    // Rutas normales
    { path: "home", renderMode: RenderMode.Prerender },

    // Wildcard con status 404 para SSR
    { path: "**", renderMode: RenderMode.Server, status: 404 },
  ];
  ```

  - Usa cabecera `Location` y `status` para devolver 301/302/308 en SSR desde Edge.
  - Para páginas no encontradas, marca `status: 404` en el wildcard del server y muestra un componente 404 en el cliente (ver abajo).

- 404 en cliente: configura una ruta wildcard que cargue un componente 404 dedicado en vez de redirigir a Home.
  ```ts
  // src/app/app.routes.ts
  { path: '**', loadComponent: () => import('../pages/not-found').then(m => m.NotFoundComponent) }
  ```
- Binding de parámetros de ruta (Angular 17+):
  - Habilita `withComponentInputBinding()` en `provideRouter(...)` (ya hecho en este repo).
  - Declara inputs en componentes que coincidan con los nombres de los parámetros:
    ```ts
    import { input, computed } from "@angular/core";
    id = input.required<string>();
    // hero = computed(() => this.service.getHero(this.id()));
    ```
  - Si un parámetro puede faltar, usa un valor por defecto con `transform` o `linkedSignal`:
    ```ts
    id = input<string | undefined>({
      transform: (maybe: string | undefined) => maybe ?? "0",
    });
    ```
  - Para heredar parámetros de rutas padre: `provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' }))`.
- netlify.toml: No uses redirects en Netlify para SSR, hazlos en `serverRoutes`.
  ```toml
  [build]
    publish = "dist/local-walls/browser"
    command = "npm run build"
  ```

## 13) Leaflet 2.0 (ESM)

- Versión: actualizado el proyecto a Leaflet 2.0.0-alpha.1 con soporte ESM nativo. No hay `L` global en core: importa desde el paquete y usa constructores.
- Importación ESM (recomendado):
  ```ts
  import { Map, TileLayer, Marker, DivIcon, LatLng, LatLngBounds } from "leaflet";
  const map = new Map("map-id").setView([51.5, -0.09], 13);
  new TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 15 }).addTo(map);
  new Marker(new LatLng(51.5, -0.09)).addTo(map);
  ```
- Sin factorías: reemplaza `L.map`, `L.tileLayer`, `L.marker`, etc. por constructores: `new Map(...)`, `new TileLayer(...)`, `new Marker(...)`, etc.
- SSR/zoneless seguro (patrón del repo): no importes Leaflet de forma estática en archivos que se ejecutan en SSR. Usa importación dinámica dentro de un guardia de navegador y sólo cuando se necesite el DOM:
  ```ts
  import { inject, PLATFORM_ID } from "@angular/core";
  import { isPlatformBrowser } from "@angular/common";
  // ...
  if (isPlatformBrowser(inject(PLATFORM_ID)) && typeof window !== "undefined") {
    const L = (await import("leaflet")).default; // default export de Leaflet 2
    const map = new L.Map(el, { center: [39.5, -0.5], zoom: 7 });
    new (L as any).TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  }
  ```

  - Nota: el repo ya implementa este patrón en `src/services/map-builder.ts`.
- CSS: mantenemos `node_modules/leaflet/dist/leaflet.css` en `angular.json`. Se eliminó el `<link>` CDN en `src/index.html` para evitar duplicidad y desajustes de versión.
- Activos de Leaflet: 2.0 cambia `layers.png` por `layers.svg` para `Control.Layers`. El builder de Angular copia los assets referenciados por la hoja de estilos automáticamente; no es necesario configurarlos manualmente.
- Eventos: Leaflet 2.0 usa Pointer Events. Tipos como `LeafletMouseEvent` ya no aplican; usa eventos genéricos (`LeafletEvent`) o accede a `originalEvent` que será `PointerEvent` en navegadores modernos.
- APIs renombradas/eliminadas relevantes:
  - `mouseEventToContainerPoint/LayerPoint/LatLng` → `pointerEventToContainerPoint/LayerPoint/LatLng`.
  - Factorías eliminadas; usa constructores.
  - `L` global no existe en core (sólo en build `leaflet-global.js`). En ESM importa símbolos explícitos.
- Plugins: muchos plugins v1x requieren polyfills o actualización. Si necesitas compatibilidad, evalúa `Leaflet V1 Polyfill` o sustituir el plugin. En este repo se eliminó la dependencia no usada `leaflet.markercluster` y sus tipos.
- Ejemplo SSR-safe (resumen):
  ```ts
  // extracto de MapBuilder del repo
  const [{ default: L }] = await Promise.all([import("leaflet")]);
  const map = new (L as any).Map(el, { center: [39.5, -0.5], zoom: 7 });
  new (L as any).TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  const bounds = new (L as any).LatLngBounds([
    [lat1, lng1],
    [lat2, lng2],
  ]);
  map.fitBounds(bounds);
  ```
