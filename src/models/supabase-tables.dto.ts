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

// Areas
export type AreaDto = Tables['areas']['Row'];
export type AreaInsertDto = Tables['areas']['Insert'];
export type AreaUpdateDto = Tables['areas']['Update'];

// Crags
export type CragDto = Tables['crags']['Row'];
export type CragInsertDto = Tables['crags']['Insert'];
export type CragUpdateDto = Tables['crags']['Update'];

// Routes
export type RouteDto = Tables['routes']['Row'];
export type RouteInsertDto = Tables['routes']['Insert'];
export type RouteUpdateDto = Tables['routes']['Update'];

// Topos
export type TopoDto = Tables['topos']['Row'];
export type TopoInsertDto = Tables['topos']['Insert'];
export type TopoUpdateDto = Tables['topos']['Update'];

// Topo-Routes (tabla pivote)
export type TopoRouteDto = Tables['topo_routes']['Row'];
export type TopoRouteInsertDto = Tables['topo_routes']['Insert'];
export type TopoRouteUpdateDto = Tables['topo_routes']['Update'];

// User Profiles
export type UserProfileDto = Tables['user_profiles']['Row'];
export type UserProfileInsertDto = Tables['user_profiles']['Insert'];
export type UserProfileUpdateDto = Tables['user_profiles']['Update'];

// Si necesitas más alias, añade aquí siguiendo el mismo patrón:
// export type ParkingDto = Tables["parkings"]["Row"]; ...
