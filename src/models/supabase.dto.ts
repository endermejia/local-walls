// Supabase DTOs y tipos compartidos para la nueva base de datos propia
// Nota: este archivo define sólo tipos/DTOs para el cliente. No contiene lógica.

// Convenciones generales
// - Identificadores UUID (string) para claves primarias.
// - Timestamps ISO (string) generados por Supabase (timestamp/timestamptz).
// - Relaciones expresadas por IDs y, cuando procede, proyecciones ligeras para el cliente.

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Roles de usuario a nivel de aplicación
export enum UserRole {
  Admin = 'admin',
  Equipper = 'equipper',
  Climber = 'climber',
}

// Visibilidad/Tipo de Topo
export type TopoVisibility = 'global' | 'paid' | 'secret';

// Tipo de escalada (para filtros y rutas)
export type ClimbKind = 'sport' | 'boulder' | 'trad' | 'multipitch' | 'mixed';

// Grado: almacenamos etiqueta y un índice normalizado para ordenar/filtrar
export interface Grade {
  label: string; // p.ej. '6b+', 'V6', '7a'
  system: 'french' | 'uiaa' | 'yds' | 'font' | 'hueco' | 'other';
  index: number; // índice comparable (cuanto mayor, más difícil)
}

// Geo
export interface CoordinatesDTO {
  lat: number;
  lng: number;
}

// Tabla: areas
export interface AreaDTO extends BaseEntity {
  name: string;
  slug: string; // único
  country_name: string;
  country_slug: string;
  description?: string | null;
  image?: string | null; // URL a Storage
  season?: number[] | null; // meses 1..12
  has_bouldering?: boolean;
  has_sport?: boolean;
  polygon_geojson?: unknown | null; // GeoJSON (Feature/Polygon)
  stats?: {
    total_crags?: number;
    total_routes?: number;
    average_rating?: number;
  } | null;
}

export interface AreaSlim {
  id: UUID;
  name: string;
  slug: string;
}

// Tabla: crags
export interface CragDTO extends BaseEntity {
  name: string;
  slug: string; // único dentro del área o global según diseño
  area_id: UUID; // FK -> areas.id
  area_name: string; // denormalizado para búsquedas rápidas
  area_slug: string;
  country_name: string;
  country_slug: string;
  location: CoordinatesDTO | null; // SRID 4326 lat/lng
  description?: string | null;
  category?: number | null; // futura clasificación interna
  stats?: {
    total_sectors?: number;
    total_routes?: number;
    average_rating?: number;
  } | null;
}

export interface CragSlim {
  id: UUID;
  name: string;
  slug: string;
  area_id: UUID;
}

// Tabla: routes (vías/bloques)
export interface RouteDTO extends BaseEntity {
  name: string;
  slug: string; // único por crag
  crag_id: UUID; // FK -> crags.id
  area_id: UUID; // redundante para agregados/consultas
  kind: ClimbKind;
  grade?: Grade | null;
  length_m?: number | null; // para deportiva/trad
  pitches?: number | null; // multilargos
  boulder_grade?: Grade | null; // para boulder si se usa sistema distinto
  orientation?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | null;
  sun_hours?: 'morning' | 'afternoon' | 'all_day' | null;
  rating_avg?: number | null; // 0..5
  rating_count?: number | null;
  description?: string | null;
  first_ascent?: {
    climber?: string | null;
    year?: number | null;
  } | null;
  is_project?: boolean; // marcada como proyecto
}

export interface RouteSlim {
  id: UUID;
  crag_id: UUID;
  name: string;
}

// Tabla: topos (croquis) y relación N:M routes<->topos
export interface TopoDTO extends BaseEntity {
  name: string;
  slug: string; // único por crag
  crag_id: UUID; // FK -> crags.id
  visibility: TopoVisibility; // global | paid | secret
  cover_image?: string | null; // URL en Storage (p.ej. bucket 'topos')
  notes?: string | null;
  price_cents?: number | null; // si visibility === 'paid'
  published: boolean; // control de publicación
}

// Tabla pivote: topo_routes (orden dentro del croquis)
export interface TopoRouteDTO extends BaseEntity {
  topo_id: UUID; // FK -> topos.id
  route_id: UUID; // FK -> routes.id
  order_number: number; // orden visual
  label_override?: string | null; // permitir etiqueta específica en el topo
}

// Users y perfiles
// Supabase Auth gestiona usuarios; esta tabla extiende con metadatos y rol
export interface UserProfileDTO extends BaseEntity {
  user_id: UUID; // Auth user id (igual que id si se usa 1:1)
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: UserRole; // admin | equipper | climber
  // Permisos específicos: crags asignados para equipadores
  allowed_crag_ids?: UUID[]; // denormalizado para lecturas rápidas
}

// Relaciones de seguimiento (follow)
export interface UserFollowAreaDTO extends BaseEntity {
  follower_user_id: UUID; // quién sigue
  area_id: UUID; // a qué área sigue
}

export interface UserFollowCragDTO extends BaseEntity {
  follower_user_id: UUID;
  crag_id: UUID;
}

export interface UserFollowRouteDTO extends BaseEntity {
  follower_user_id: UUID;
  route_id: UUID;
}

export interface UserFollowUserDTO extends BaseEntity {
  follower_user_id: UUID;
  followed_user_id: UUID;
}

// Proyecciones/DTOs compuestos para el cliente
export interface CragWithToposDTO extends CragDTO {
  topos: Pick<
    TopoDTO,
    'id' | 'name' | 'slug' | 'visibility' | 'cover_image' | 'published'
  >[];
}

export interface TopoWithRoutesDTO extends TopoDTO {
  routes: {
    route: Pick<
      RouteDTO,
      'id' | 'name' | 'slug' | 'kind' | 'grade' | 'boulder_grade' | 'rating_avg'
    >;
    order_number: number;
    label_override?: string | null;
  }[];
}

// Respuestas estándar
export interface PageableResponseDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionFlags {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface EntityWithPermissions<T> {
  entity: T;
  permissions: PermissionFlags;
}
