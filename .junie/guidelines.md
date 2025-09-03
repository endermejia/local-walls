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
