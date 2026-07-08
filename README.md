# ClimBeast

Una moderna aplicación web diseñada para ayudar a los escaladores a descubrir y navegar zonas de escalada.
Desarrollada para Sergio Solbes Ferri.

La aplicación incluye un mapa interactivo para explorar spots de escalada, información detallada de las vías, y un diseño responsive orientado a dispositivos móviles.
Utiliza Server-Side Rendering (SSR) para un mejor rendimiento y SEO, implementando una arquitectura totalmente reactiva con Angular Signals para la gestión del estado.

## Funcionalidades

- 🗺️ Mapa interactivo con zonas de escalada
- 📱 Diseño responsive "mobile-first"
- 🚀 Carga rápida con SSR y carga diferida (lazy loading)
- 🔍 Búsqueda y filtrado de spots de escalada
- 📍 Soporte para geolocalización
- 🌐 Soporte multilingüe
- 📶 Aplicación Web Progresiva (PWA) con soporte offline

## Tecnologías Utilizadas

- [Angular 21](https://github.com/angular/angular-cli)
  - SSR (Server-Side Rendering)
  - Change detection sin Zone.js (Zoneless)
  - Signals para gestión de estado
- [Taiga UI](https://taiga-ui.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Autenticación + RLS)

## Próximos Pasos

- **✨ Mejora del Menú de Perfil (UX)**:
  - Modificar la vista del perfil. Sustituir el botón de **Perfil del navbar** por un desplegable con iconos.
  - Centralizar accesos directos: Mis sectores, Logbook, Configuración y botones del `menu-button`.
- **🛡️ Sistema de Gestión de Permisos y Solicitudes**:
  - **Administradores de Áreas**: Refinar el flujo en `AdminAreaRequestsComponent`. Implementar notificaciones push al aprobar/rechazar.
  - **Relación con Equipadores**: Crear un flujo para que los usuarios soliciten vincularse a un "Equipador" oficial, permitiendo la atribución correcta de nuevas vías.
  - **Validación por Roles**: Asegurar que las RLS de Supabase y los Guards de Angular cubran los nuevos estados de "pendiente de validación".
- **📊 Integración Avanzada con 8a.nu**:
  - Implementar la importación directa de ascensos usando las credenciales del usuario (vía `EightAnuService`).
  - Sincronización automática de bases de datos: mapeo inteligente de sectores y vías entre ClimBeast y 8a.nu.
  - Visualización de estadísticas comparativas (grado medio, pirámide de ascensos).

## Funcionalidades Futuras

- **🗓️ Planificador de Viajes Inteligente**:
  - Filtros meteorológicos: Integración con API de clima para sugerir sectores sin lluvia en las fechas seleccionadas.
  - Filtros por grado y estilo: Algoritmo de recomendación basado en el logbook del usuario y de sus acompañantes.
  - Generación de itinerarios exportables y compartibles.
- **🏋️ Ecosistema de Entrenamiento**:
  - **Calendario y Planificación**: Interfaz "drag-and-drop" para organizar sesiones de fuerza, resistencia y técnica.
  - **Modo Ejecución**: Temporizadores específicos para series (Beastmaker, suspensiones) y fases de entrenamiento.
  - **Red de Entrenadores**: Marketplace o sistema de vinculación donde entrenadores pueden asignar rutinas a sus alumnos y monitorizar progresos.
  - **Analíticas**: Gráficos de carga de entrenamiento y fatiga.
- **🧗 Sección Indoor (Gestión de Rocódromos)**:
  - Implementar la hoja de ruta detallada abajo para centros de escalada.
  - Sistema de check-in mediante código QR y gestión de bonos en tiempo real.

## 🧗 Sección Indoor (Próxima fase)

Esta sección detalla la hoja de ruta para la implementación de los centros de escalada indoor, incluyendo la gestión administrativa completa y la experiencia del usuario.

### 1. 🗄️ Base de Datos y Almacenamiento

Para habilitar la gestión comercial y de usuarios, es necesario añadir las siguientes tablas y configurar el almacenamiento:

#### Tablas en Supabase:

- **`indoor_vouchers`**: Definición de tipos de bonos (10 sesiones, mensual, anual, trimestral).
  - Campos: `id`, `center_id`, `name`, `price`, `sessions_count` (null si es tiempo), `duration_days`, `active`.
- **`indoor_voucher_purchases`**: Registro de compras de bonos por usuarios.
  - Campos: `id`, `user_id`, `voucher_id`, `purchase_date`, `expiration_date`, `remaining_sessions`, `status` (active/expired/exhausted).
- **`indoor_voucher_usage`**: Historial de uso de cada bono (check-ins).
  - Campos: `id`, `purchase_id`, `usage_date`.
- **`indoor_sales`**: Registro general de ventas (entradas de día, material de alquiler, magnesio, etc.).
  - Campos: `id`, `center_id`, `user_id` (opcional), `item_name`, `amount`, `category`, `payment_method`, `created_at`.
- **`indoor_inventory`**: Gestión simple de stock para productos (magnesio, pies de gato, camisetas del centro).
  - Campos: `id`, `center_id`, `item_name`, `stock_quantity`, `price`.

#### 📦 Almacenamiento (Storage Buckets):

En este proyecto, los archivos binarios (imágenes) se guardan en **Buckets**. Para mantener la consistencia con el resto de la app (como en `topo-form.ts`), no usaremos una tabla intermedia de fotos a menos que se requiera una galería. La URL o el path del bucket se guarda directamente en la propiedad `image_url` (o `photo`) de la tabla correspondiente.

Se requieren los siguientes buckets:

- **`topos`** (existente): Se usará tanto para roca como para indoor. El path se guarda en `indoor_topos.image_url`.
- **`indoor-centers`**: Para avatares y fotos de las instalaciones del centro. El path se guarda en `indoor_centers.avatar_url` (nuevo campo) o dentro de `contact_info` (Json).
- **`indoor-assets`**: Para imágenes de artículos de la tienda o iconos de bonos.

> **Nota sobre la simplificación**: Siguiendo el patrón de `topo-form`, eliminamos la necesidad de la tabla `indoor_topo_photos`. El proceso de subida obtiene la URL firmada y actualiza directamente el campo en `indoor_topos`. Esto simplifica la lógica de los formularios y mantiene la coherencia visual y técnica.

### 2. 🏗️ Componentes de Angular a Crear

- **Administración (`/src/pages/indoor/admin`)**:
  - `IndoorAdminDashboard`: Vista general con métricas rápidas (ventas de hoy, usuarios activos).
  - `IndoorUserManagement`: Buscador de usuarios del centro, visualización de sus bonos activos e historial de compras.
  - `IndoorVoucherEditor`: CRUD para los tipos de bonos que ofrece el centro.
  - `IndoorSalesPanel`: Interfaz de "punto de venta" (POS) simplificada para registrar ventas rápidas en mostrador.
  - `IndoorAccountingView`: Tablas y gráficos de balances, exportación a CSV/PDF.
- **Usuario (`/src/pages/indoor/center-detail`)**:
  - `IndoorVoucherCard`: Componente para mostrar el estado del bono actual del usuario (sesiones restantes, fecha de fin).
  - `IndoorVoucherStore`: Lista de bonos disponibles para compra online.
  - `IndoorCheckInHistory`: Listado de días que el usuario ha asistido al centro.

### 3. 🛠️ Funcionalidades Clave

#### Para Administradores de Centros:

- **Gestión de Usuarios**: Poder ver el perfil de escalador de sus clientes y su fidelidad.
- **Validación de Bonos**: Sistema rápido para "picar" una sesión cuando el usuario llega al mostrador.
- **Contabilidad y Balances**: Filtros por fecha para ver ingresos, desglose por método de pago y categoría de producto.
- **Historial de Ventas**: Poder anular o corregir ventas erróneas.
- **Gestión de Administradores**: El dueño del centro puede añadir otros usuarios como administradores con diferentes permisos (ej: solo ventas, o administración total).

#### Para Usuarios (Escaladores):

- **Dashboard Personal Indoor**: Ver cuántas sesiones quedan en su bono de 10 o cuándo caduca su mensualidad.
- **Notificaciones**: Avisos cuando un bono está a punto de caducar o quedan pocas sesiones.
- **Compra Online**: Poder renovar el bono directamente desde la app (integración con Stripe).
- **Filtro Indoor**: Integración total en el mapa y feed de la app para descubrir centros y ver sus rutas actuales.

---

## Navegación

La aplicación utiliza un sistema de navegación responsivo que se adapta al tamaño de la pantalla del dispositivo. En escritorio, cuenta con una barra lateral colapsable, mientras que en móvil, cambia a una barra de navegación inferior.

### Secciones Principales

- **🏠 Inicio**: Panel personalizado con actividad reciente y actualizaciones.
- **🗺️ Explorar**: Mapa interactivo para descubrir zonas de escalada con filtrado avanzado (grado, estilo, sombra, etc.).
- **📜 Áreas**: Una vista de lista completa de todas las áreas de escalada para un acceso rápido.
- **⚙️ Admin / Mis Áreas**: Panel de gestión para administradores y equipadores para organizar la información de los sectores.
- **👤 Perfil de Usuario**: Acceso a tu logbook, estadísticas personales y configuración de cuenta.

### Jerarquía de Contenido

- **Detalles del Área**: Descripción general de una región de escalada, incluyendo sus sectores e información general.
- **Detalles del Sector**: Vista detallada de un sector específico, con listas de vías, gráficos de grado e información de aproximación.
- **Visor de Topos**: Imágenes interactivas de croquis con superposiciones de las vías para una navegación precisa.
- **Detalles de la Vía**: Especificaciones técnicas, distribución de grados e historial de ascensiones de usuarios.

## PWA & Service Worker

La aplicación está configurada como una PWA utilizando Angular Service Worker. Proporciona:

- Caché offline de la "app shell" y los recursos estáticos.
- Manifiesto instalable para móvil y escritorio.

## Desarrollo

### Requisitos previos

- Node.js & npm
- Cuenta de Supabase (para base de datos y autenticación)

### Configuración Local

```bash
bun install
bun start
```

### Pruebas SSR

```bash
bun run build
bun run serve:ssr:climbeast
```

## Contribuir

Este repositorio ejecuta Prettier automáticamente antes de cada commit mediante Husky + lint-staged.

---

Desarrollado para Sergio Solbes Ferri.

[ClimBeast](https://climbeast.com) 🚀
