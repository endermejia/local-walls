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

// Chat
export type ChatRoomDto = TableRow<'chat_rooms'>;
export type ChatRoomInsertDto = TableInsert<'chat_rooms'>;
export type ChatRoomUpdateDto = TableUpdate<'chat_rooms'>;

export type ChatParticipantDto = TableRow<'chat_participants'>;
export type ChatParticipantInsertDto = TableInsert<'chat_participants'>;
export type ChatParticipantUpdateDto = TableUpdate<'chat_participants'>;

export type ChatMessageDto = TableRow<'chat_messages'>;
export type ChatMessageInsertDto = TableInsert<'chat_messages'>;
export type ChatMessageUpdateDto = TableUpdate<'chat_messages'>;

// Notifications
export type NotificationDto = TableRow<'notifications'>;
export type NotificationInsertDto = TableInsert<'notifications'>;
export type NotificationUpdateDto = TableUpdate<'notifications'>;

/**
 * TODO: Para habilitar el chat en tiempo real y las notificaciones en directo,
 * ejecuta los siguientes comandos SQL en tu consola de Supabase:
 *
 * ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
 * ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
 *
 * -- Para habilitar RLS en las tablas de social y chat:
 * ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
 *
 * -- Políticas para notifications:
 * CREATE POLICY "Users can see their own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
 * CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
 * CREATE POLICY "Users can insert notifications for others" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
 *
 * -- Políticas para chat_rooms:
 * CREATE POLICY "Users can see rooms they are in" ON chat_rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_rooms.id AND user_id = auth.uid()));
 * CREATE POLICY "Authenticated users can create rooms" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (true);
 *
 * -- Políticas para chat_participants:
 * CREATE POLICY "Users can see other participants in their rooms" ON chat_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_participants AS cp WHERE cp.room_id = chat_participants.room_id AND cp.user_id = auth.uid()));
 * CREATE POLICY "Authenticated users can add themselves/others to rooms" ON chat_participants FOR INSERT TO authenticated WITH CHECK (true);
 *
 * -- Políticas para chat_messages:
 * CREATE POLICY "Users can see messages in their rooms" ON chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid()));
 * CREATE POLICY "Users can send messages to their rooms" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid()));
 */
