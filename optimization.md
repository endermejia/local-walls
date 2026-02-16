# Propuestas de Optimización de Consultas

A continuación se detallan las áreas identificadas donde las consultas a la base de datos (Supabase) están solicitando más información de la necesaria (`over-fetching`). Se sugiere restringir los campos seleccionados (`select`) para reducir el tamaño del payload y mejorar el rendimiento.

## 1. AscentsService (`src/services/ascents.service.ts`)

### `getAscentById`
- **Consulta Actual:** Se obtienen todos los campos del perfil del usuario (`user:user_profiles(*)`).
- **Optimización:** Seleccionar solo los campos necesarios para mostrar al autor.
- **Cambio Propuesto:** `.select('..., user:user_profiles(id, name, avatar)')`

### `getLikesPaginated`
- **Consulta Actual:** Se obtienen todos los campos de los perfiles que dieron like (`user_profiles(*)`).
- **Optimización:** Solo se necesita información básica para listar usuarios.
- **Cambio Propuesto:** `.select('id, name, avatar')`

### `getComments` y `getLastComment`
- **Consulta Actual:** Se obtienen todos los campos del perfil de los comentaristas (`user_profiles(*)`).
- **Optimización:** Solo se necesita información básica para el avatar y nombre.
- **Cambio Propuesto:** `.select('id, name, avatar')`

## 2. GlobalData (`src/services/global-data.ts`)

### `userAscentsResource`
- **Consulta Actual:** Al obtener la lista de ascensos de un usuario, se hace un join con `route:routes!inner(*)`.
- **Optimización:** La tabla `routes` es ligera, pero si crece, no necesitamos todos los campos técnicos (como `eight_anu_route_slugs` o `user_creator_id`) para una lista.
- **Cambio Propuesto:** Seleccionar explícitamente columnas: `route:routes(id, name, slug, grade, climbing_kind, ...)`

### `routeAscentsResource`
- **Consulta Actual:** Obtiene todos los ascensos de una vía y luego todos los perfiles de usuario completos (`user_profiles(*)`).
- **Optimización:** Para el listado de "quién ha encadenado", solo necesitamos identidad básica.
- **Cambio Propuesto:** `.select('id, name, avatar')` en la consulta de perfiles.

### `topoDetailResource`
- **Consulta Actual:** `topo_routes(*, route:routes(*, ...))`
- **Optimización:** Al ver un croquis (topo), generalmente solo necesitamos saber el nombre, grado y tipo de la vía para pintarla o listarla. No necesitamos `created_at`, `user_creator_id`, etc.
- **Cambio Propuesto:** `route:routes(id, name, slug, grade, climbing_kind)`

### `cragDetailResource`
- **Consulta Actual:** `area:areas!inner(id, name, slug)` (Correcto), pero `topos(*)` selecciona todo de topos.
- **Observación:** `topos` es una tabla pequeña, pero vale la pena revisar si `photo` (path) es lo único pesado.

## 3. MessagingService (`src/services/messaging.service.ts`)

### `getRooms`
- **Consulta Actual:** `participants:chat_participants(user:user_profiles(*))`
- **Optimización:** La lista de chats solo necesita mostrar el avatar y nombre del otro participante. No se necesita `bio`, `city`, `email`, etc.
- **Cambio Propuesto:** `user:user_profiles(id, name, avatar)`

## 4. UserProfilesService (`src/services/user-profiles.service.ts`)

### `searchUsers`
- **Consulta Actual:** `.select('*')`
- **Optimización:** El autocompletado/búsqueda solo necesita identificar al usuario.
- **Cambio Propuesto:** `.select('id, name, avatar')`

### `getUserProfile`
- **Consulta Actual:** `.select('*')`
- **Optimización:** Si bien es la página de perfil, campos como `settings` (si existieran en el futuro) o metadatos internos podrían excluirse si no son editables por quien ve el perfil.
- **Cambio Propuesto:** Revisar si todos los campos son públicos/necesarios.
