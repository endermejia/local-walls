# ClimBeast — Lista de mejoras

## Alta prioridad

1. **Dividir `GlobalData` (2600+ líneas)** — Servicio上帝 que contiene resources, signals, effects, lógica de negocio para áreas, crags, rutas, topos, mapa, filtros, permisos. Dividir en servicios de dominio: `MapDataService`, `TopoDataService`, `AreaDataService`, `ProfileDataService`, `FilterStateService`.
2. **Eliminar `PreloadAllModules`** — Pre-carga todos los chunks lazy en la primera navegación, anulando el beneficio de lazy loading. Usar `PreselectivePreloading` solo para rutas de alta demanda (`/home`, `/area`).
3. **`bypassSecurityTrustHtml` en `MentionLinkPipe`** — Riesgo XSS. Reemplazar con sanitización segura usando `SecurityContext.HTML` o DOMPurify.
4. **Estrategia offline-first** — NGSW cachea datos 3 días pero no hay indicador visual de modo offline. Añadir "última actualización" y banner por sección.

## Media prioridad

5. **`setInterval` sin cleanup en `AppComponent`** — Nunca se limpia. Almacenar el ID y limpiar en `ngOnDestroy`.
6. **Código duplicado en mapeo `RouteWithExtras`** — ~50 líneas copiadas en 5 resources. Extraer a un mapper compartido.
7. **Auth guard bypass del resource cache** — Consulta directa a Supabase en vez de usar `userProfileResource`, causando datos obsoletos.
8. **100+ `console.log/warn/error`** — Quitar o reemplazar con servicio de logging estructurado silenciable en producción.
9. **Accesibilidad** — Sin `alt` en imágenes, sin `aria-label` en botones de mapa, sin roles ARIA en diálogos y tablas.
10. **`user-select: none` global** — Impide copiar nombres de vías y descripciones. Solo aplicar en elementos interactivos.
11. **Leaflet en versión alpha (2.0.0-alpha.1)** — Riesgo en producción. Fijar a la última versión estable 1.x.
12. **Sin deshacer para acciones destructivas** — Borrar ascenso, eliminar ruta del topo, dejar de seguir. Añadir undo-toasts.
13. **Sin compartir rutas/áreas** — Integrar Web Share API con fallback a clipboard copy.

## Baja prioridad

14. **`Proxy` en permisos de admin** — Puede causar problemas con change detection y testing. Usar `Set` o método `hasPermission()`.
15. **Inconsistencia en patrones** — `@Output()` vs `output()`, `unsubscribe()` manual vs `takeUntilDestroyed()`, `FormsModule` no usado.
16. **Error dialog con flag `isOpen`** — Silencia errores rápidos. Usar cola o al menos loguear.
17. **SW `registerImmediately`** — Competir en conexiones lentas. Considerar `registerWhenStable:30000`.
