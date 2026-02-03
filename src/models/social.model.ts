import {
  ChatMessageDto,
  ChatRoomDto,
  NotificationDto,
  UserProfileDto,
} from './supabase-interfaces';

export interface ChatRoomWithParticipant extends ChatRoomDto {
  participant: UserProfileDto;
  last_message?: ChatMessageDto;
  unread_count: number;
}

export interface NotificationWithActor extends NotificationDto {
  actor: UserProfileDto;
}
