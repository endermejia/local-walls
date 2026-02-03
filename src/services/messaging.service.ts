import { inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import {
    ChatMessageDto,
    ChatMessageInsertDto,
    ChatRoomWithParticipant,
    UserProfileDto
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly unreadMessagesCount = signal(0);

  async getRooms(): Promise<ChatRoomWithParticipant[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    // Get rooms where I am a participant
    const { data: participations, error: partError } = await this.supabase.client
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', userId);

    if (partError || !participations?.length) return [];

    const roomIds = participations.map(p => p.room_id);

    const { data: rooms, error: roomsError } = await this.supabase.client
      .from('chat_rooms')
      .select(`
        *,
        participants:chat_participants(user:user_profiles(*)),
        messages:chat_messages(text, created_at, sender_id, read_at)
      `)
      .in('id', roomIds)
      .order('last_message_at', { ascending: false });

    if (roomsError) {
      console.error('[MessagingService] getRooms error', roomsError);
      return [];
    }

    interface RoomQueryResult {
      id: string;
      created_at: string;
      last_message_at: string;
      participants: {
        user: UserProfileDto;
      }[];
      messages: {
        text: string;
        created_at: string;
        sender_id: string;
        read_at: string | null;
      }[];
    }

    const typedRooms = rooms as unknown as RoomQueryResult[];

    return typedRooms.map((r) => {
      const otherParticipant = r.participants.find(
        (p) => p.user.id !== userId,
      )?.user;

      const lastMessage = [...r.messages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

      const unreadCount = r.messages.filter(
        (m) => m.sender_id !== userId && !m.read_at,
      ).length;

      return {
        id: r.id,
        created_at: r.created_at,
        last_message_at: r.last_message_at,
        participant: otherParticipant,
        last_message: lastMessage,
        unread_count: unreadCount,
      } as ChatRoomWithParticipant;
    });
  }

  async getMessages(roomId: string, limit = 20, offset = 0): Promise<ChatMessageDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[MessagingService] getMessages error', error);
      return [];
    }

    return data;
  }

  async sendMessage(roomId: string, text: string): Promise<ChatMessageDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return null;

    const payload: ChatMessageInsertDto = {
      room_id: roomId,
      sender_id: userId,
      text
    };

    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
        console.error('[MessagingService] sendMessage error', error);
        return null;
    }

    // Update last_message_at in room
    await this.supabase.client
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', roomId);

    return data;
  }

  async getOrCreateRoom(otherUserId: string): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return null;

    // Check if room already exists between these two
    const { data: myRooms } = await this.supabase.client
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', userId);

    const { data: otherRooms } = await this.supabase.client
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', otherUserId);

    const commonRoomId = myRooms?.find(mr => otherRooms?.some(or => or.room_id === mr.room_id))?.room_id;

    if (commonRoomId) return commonRoomId;

    // Create new room
    const { data: newRoom, error: roomError } = await this.supabase.client
        .from('chat_rooms')
        .insert({})
        .select()
        .single();

    if (roomError) return null;

    await this.supabase.client
        .from('chat_participants')
        .insert([
            { room_id: newRoom.id, user_id: userId },
            { room_id: newRoom.id, user_id: otherUserId }
        ]);

    return newRoom.id;
  }

  async markAsRead(roomId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { error } = await this.supabase.client
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .is('read_at', null);

    if (!error) {
        this.refreshUnreadCount();
    }
  }

  async refreshUnreadCount(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { data: myRooms } = await this.supabase.client
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', userId);

    if (!myRooms?.length) {
        this.unreadMessagesCount.set(0);
        return;
    }

    const roomIds = myRooms.map(r => r.room_id);

    const { count, error } = await this.supabase.client
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .neq('sender_id', userId)
        .is('read_at', null);

    if (!error) {
        this.unreadMessagesCount.set(count ?? 0);
    }
  }

  watchMessages(
    roomId: string,
    callback: (message: ChatMessageDto) => void,
  ): RealtimeChannel | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.supabase.client
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new as ChatMessageDto);
        }
      )
      .subscribe();
  }

  watchUnreadCount(callback: () => void): RealtimeChannel | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.supabase.client
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          callback();
        }
      )
      .subscribe();
  }
}
