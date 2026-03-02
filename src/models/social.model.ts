import {
  ChatMessageDto,
  ChatRoomDto,
  NotificationDto,
  UserProfileDto,
} from './supabase-interfaces';
import { UserProfileBasicDto } from './user.model';
import { NotificationType } from './notifications.model';

export interface ChatRoomWithParticipant extends ChatRoomDto {
  participant?: UserProfileBasicDto;
  last_message?: ChatMessageDto;
  unread_count: number;
}

export interface NotificationWithActor extends Omit<NotificationDto, 'type'> {
  type: NotificationType | string;
  actor: UserProfileDto;
  resource_name?: string;
}
