import type { Database, Json } from './supabase-generated';

type Tables = Database['public']['Tables'];
export type DatabaseTable = keyof Tables;

export type TableRow<T extends DatabaseTable> = Tables[T]['Row'];
export type TableInsert<T extends DatabaseTable> = Tables[T]['Insert'];
export type TableUpdate<T extends DatabaseTable> = Tables[T]['Update'];

// --- Common DTOs ---
export type UserProfileDto = TableRow<'user_profiles'>;
export type UserProfileUpdateDto = TableUpdate<'user_profiles'>;
export type UserPyramidSlotDto = TableRow<'user_pyramid_slots'>;
export type UserPyramidSlotInsertDto = TableInsert<'user_pyramid_slots'>;
export type RouteDto = TableRow<'routes'>;
export type RouteAscentDto = TableRow<'route_ascents'>;
export type EquipperDto = TableRow<'equippers'>;
export type ParkingDto = TableRow<'parkings'>;
export type ParkingInsertDto = TableInsert<'parkings'>;
export type ParkingUpdateDto = TableUpdate<'parkings'>;
export type TopoDto = TableRow<'topos'>;
export type TopoInsertDto = TableInsert<'topos'>;
export type TopoUpdateDto = TableUpdate<'topos'>;
export type TopoRouteInsertDto = TableInsert<'topo_routes'>;
export type RouteAscentCommentDto = TableRow<'route_ascent_comments'>;
export type ChatMessageDto = TableRow<'chat_messages'>;
export type ChatMessageInsertDto = TableInsert<'chat_messages'>;
export type ChatRoomDto = TableRow<'chat_rooms'>;
export type NotificationDto = TableRow<'notifications'>;
export type NotificationInsertDto = TableInsert<'notifications'>;
export type FollowRequestDto = TableRow<'follow_requests'>;

export type RouteInsertDto = TableInsert<'routes'>;
export type RouteUpdateDto = TableUpdate<'routes'>;
export type RouteAscentInsertDto = TableInsert<'route_ascents'>;
export type RouteAscentUpdateDto = TableUpdate<'route_ascents'>;
export type RouteAscentCommentInsertDto = TableInsert<'route_ascent_comments'>;

// --- Database Utilities ---
export { Json };
