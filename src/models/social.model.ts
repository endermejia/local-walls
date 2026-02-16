import {
  ChatMessageDto,
  ChatRoomDto,
  NotificationDto,
  UserProfileDto,
} from './supabase-interfaces';
import { UserProfileBasicDto } from './user.model';

export interface ChatRoomWithParticipant extends ChatRoomDto {
  participant: UserProfileBasicDto;
  last_message?: ChatMessageDto;
  unread_count: number;
}

export interface NotificationWithActor extends NotificationDto {
  actor: UserProfileDto;
  resource_name?: string;
}
