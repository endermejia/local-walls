// Tipos alias derivados de los tipos generados por Supabase
// Fuente: ./supabase-generated.ts (archivo autogenerado por Supabase)
// Nota: Estos tipos son alias directos a `Tables[TableName].Row/Insert/Update`.
// No modificar a mano las estructuras; si cambian las tablas, re-generar `supabase-generated.ts`.

import type { Database } from './supabase-generated';

type Tables = Database['public']['Tables'];

// Utilidades genéricas (opcionales) por si se necesitan en otros sitios
export type TableRow<TTable extends keyof Tables> = Tables[TTable]['Row'];
export type TableInsert<TTable extends keyof Tables> = Tables[TTable]['Insert'];
export type TableUpdate<TTable extends keyof Tables> = Tables[TTable]['Update'];

// Area Likes
export type AreaLikeDto = Tables['area_likes']['Row'];
export type AreaLikeInsertDto = Tables['area_likes']['Insert'];
export type AreaLikeUpdateDto = Tables['area_likes']['Update'];

// Areas
export type AreaDto = Tables['areas']['Row'];
export type AreaInsertDto = Tables['areas']['Insert'];
export type AreaUpdateDto = Tables['areas']['Update'];

// Crag Equippers
export type CragEquipperDto = Tables['crag_equippers']['Row'];
export type CragEquipperInsertDto = Tables['crag_equippers']['Insert'];
export type CragEquipperUpdateDto = Tables['crag_equippers']['Update'];

// Crag Likes
export type CragLikeDto = Tables['crag_likes']['Row'];
export type CragLikeInsertDto = Tables['crag_likes']['Insert'];
export type CragLikeUpdateDto = Tables['crag_likes']['Update'];

// Crag Parkings
export type CragParkingDto = Tables['crag_parkings']['Row'];
export type CragParkingInsertDto = Tables['crag_parkings']['Insert'];
export type CragParkingUpdateDto = Tables['crag_parkings']['Update'];

// Crags
export type CragDto = Tables['crags']['Row'];
export type CragInsertDto = Tables['crags']['Insert'];
export type CragUpdateDto = Tables['crags']['Update'];

// Equippers
export type EquipperDto = Tables['equippers']['Row'];
export type EquipperInsertDto = Tables['equippers']['Insert'];
export type EquipperUpdateDto = Tables['equippers']['Update'];

// Parkings
export type ParkingDto = Tables['parkings']['Row'];
export type ParkingInsertDto = Tables['parkings']['Insert'];
export type ParkingUpdateDto = Tables['parkings']['Update'];

// Route Ascents
export type RouteAscentDto = Tables['route_ascents']['Row'];
export type RouteAscentInsertDto = Tables['route_ascents']['Insert'];
export type RouteAscentUpdateDto = Tables['route_ascents']['Update'];

// Route Equippers
export type RouteEquipperDto = Tables['route_equippers']['Row'];
export type RouteEquipperInsertDto = Tables['route_equippers']['Insert'];
export type RouteEquipperUpdateDto = Tables['route_equippers']['Update'];

// Route Likes
export type RouteLikeDto = Tables['route_likes']['Row'];
export type RouteLikeInsertDto = Tables['route_likes']['Insert'];
export type RouteLikeUpdateDto = Tables['route_likes']['Update'];

// Route Projects
export type RouteProjectDto = Tables['route_projects']['Row'];
export type RouteProjectInsertDto = Tables['route_projects']['Insert'];
export type RouteProjectUpdateDto = Tables['route_projects']['Update'];

// Routes
export type RouteDto = Tables['routes']['Row'];
export type RouteInsertDto = Tables['routes']['Insert'];
export type RouteUpdateDto = Tables['routes']['Update'];

// Topo Routes
export type TopoRouteDto = Tables['topo_routes']['Row'];
export type TopoRouteInsertDto = Tables['topo_routes']['Insert'];
export type TopoRouteUpdateDto = Tables['topo_routes']['Update'];

// Topos
export type TopoDto = Tables['topos']['Row'];
export type TopoInsertDto = Tables['topos']['Insert'];
export type TopoUpdateDto = Tables['topos']['Update'];

// User Profiles
export type UserProfileDto = Tables['user_profiles']['Row'];
export type UserProfileInsertDto = Tables['user_profiles']['Insert'];
export type UserProfileUpdateDto = Tables['user_profiles']['Update'];
