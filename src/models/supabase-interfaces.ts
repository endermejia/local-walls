import type { Database } from '../models';

type Tables = Database['public']['Tables'];
export type DatabaseTable = keyof Tables;

// Enums
export type AppRole = Database['public']['Enums']['app_role'];
export const AppRoles: Record<Uppercase<AppRole>, AppRole> = {
  ADMIN: 'admin',
  EQUIPPER: 'equipper',
  CLIMBER: 'climber',
} as const;
export type AscentType = Database['public']['Enums']['ascent_type'];
export const AscentTypes: Record<Uppercase<AscentType>, AscentType> = {
  RP: 'rp',
  OS: 'os',
  F: 'f',
} as const;
export type ClimbingKind = Database['public']['Enums']['climbing_kind'];
export const ClimbingKinds: Record<Uppercase<ClimbingKind>, ClimbingKind> = {
  SPORT: 'sport',
  BOULDER: 'boulder',
  MIXED: 'mixed',
  MULTIPITCH: 'multipitch',
  TRAD: 'trad',
} as const;

export const CLIMBING_ICONS: Record<ClimbingKind, string> = {
  sport: '@tui.line-squiggle',
  boulder: '@tui.box',
  mixed: '@tui.mountain',
  multipitch: '@tui.mountain',
  trad: '@tui.mountain',
};
export type Language = Database['public']['Enums']['language'];
export const Languages: Record<Uppercase<Language>, Language> = {
  ES: 'es',
  EN: 'en',
} as const;
export type Sex = Database['public']['Enums']['sex'];
export const Sexes: Record<Uppercase<Sex>, Sex> = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
export type Theme = Database['public']['Enums']['theme'];
export const Themes: Record<Uppercase<Theme>, Theme> = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Generic utilities (optional) for use elsewhere
export type TableRow<TTable extends keyof Tables> = Tables[TTable]['Row'];
export type TableInsert<TTable extends keyof Tables> = Tables[TTable]['Insert'];
export type TableUpdate<TTable extends keyof Tables> = Tables[TTable]['Update'];

// Equippers
export type EquipperDto = TableRow<'equippers'>;
export type EquipperInsertDto = TableInsert<'equippers'>;
export type EquipperUpdateDto = TableUpdate<'equippers'>;

// Parkings
export type ParkingDto = TableRow<'parkings'>;
export type ParkingInsertDto = TableInsert<'parkings'>;
export type ParkingUpdateDto = TableUpdate<'parkings'>;

// Route Ascents
export type RouteAscentDto = TableRow<'route_ascents'>;
export type RouteAscentInsertDto = TableInsert<'route_ascents'>;
export type RouteAscentUpdateDto = TableUpdate<'route_ascents'>;

// Route Equippers
export type RouteEquipperDto = TableRow<'route_equippers'>;
export type RouteEquipperInsertDto = TableInsert<'route_equippers'>;
export type RouteEquipperUpdateDto = TableUpdate<'route_equippers'>;

// Route Likes
export type RouteLikeDto = TableRow<'route_likes'>;
export type RouteLikeInsertDto = TableInsert<'route_likes'>;
export type RouteLikeUpdateDto = TableUpdate<'route_likes'>;

// Route Projects
export type RouteProjectDto = TableRow<'route_projects'>;
export type RouteProjectInsertDto = TableInsert<'route_projects'>;
export type RouteProjectUpdateDto = TableUpdate<'route_projects'>;

// Routes
export type RouteDto = TableRow<'routes'>;
export type RouteInsertDto = TableInsert<'routes'>;
export type RouteUpdateDto = TableUpdate<'routes'>;

// Topo Routes
export type TopoRouteDto = TableRow<'topo_routes'>;
export type TopoRouteInsertDto = TableInsert<'topo_routes'>;
export type TopoRouteUpdateDto = TableUpdate<'topo_routes'>;

// Topos
export type TopoDto = TableRow<'topos'>;
export type TopoInsertDto = TableInsert<'topos'>;
export type TopoUpdateDto = TableUpdate<'topos'>;

// User Profiles
export type UserProfileDto = TableRow<'user_profiles'>;
export type UserProfileInsertDto = TableInsert<'user_profiles'>;
export type UserProfileUpdateDto = TableUpdate<'user_profiles'>;

// Route Ascent Comments
export type RouteAscentCommentDto = TableRow<'route_ascent_comments'>;
export type RouteAscentCommentInsertDto = TableInsert<'route_ascent_comments'>;
export type RouteAscentCommentUpdateDto = TableUpdate<'route_ascent_comments'>;
