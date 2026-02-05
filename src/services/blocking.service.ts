import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

export interface BlockState {
  blockMessages: boolean;
  blockAscents: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BlockingService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

  readonly blockChange = signal<number>(0);

  private notifyChange() {
    this.blockChange.update((v) => v + 1);
  }

  async getBlockState(targetUserId: string): Promise<BlockState> {
    if (!isPlatformBrowser(this.platformId))
      return { blockMessages: false, blockAscents: false };
    const userId = this.supabase.authUserId();
    if (!userId) return { blockMessages: false, blockAscents: false };

    const { data, error } = await this.supabase.client
      .from('user_blocks')
      .select('block_messages, block_ascents')
      .eq('blocker_id', userId)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('[BlockingService] getBlockState error', error);
      return { blockMessages: false, blockAscents: false };
    }

    if (!data) return { blockMessages: false, blockAscents: false };

    return {
      blockMessages: data.block_messages,
      blockAscents: data.block_ascents,
    };
  }

  async toggleBlockMessages(
    targetUserId: string,
    currentAscentsBlocked: boolean,
  ): Promise<boolean> {
    return this.upsertBlock(targetUserId, true, currentAscentsBlocked);
  }

  async toggleUnblockMessages(
    targetUserId: string,
    currentAscentsBlocked: boolean,
  ): Promise<boolean> {
    return this.upsertBlock(targetUserId, false, currentAscentsBlocked);
  }

  async toggleBlockAscents(
    targetUserId: string,
    currentMessagesBlocked: boolean,
  ): Promise<boolean> {
    return this.upsertBlock(targetUserId, currentMessagesBlocked, true);
  }

  async toggleUnblockAscents(
    targetUserId: string,
    currentMessagesBlocked: boolean,
  ): Promise<boolean> {
    return this.upsertBlock(targetUserId, currentMessagesBlocked, false);
  }

  private async upsertBlock(
    targetUserId: string,
    blockMessages: boolean,
    blockAscents: boolean,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    // If both are false, we delete the row
    if (!blockMessages && !blockAscents) {
      const { error } = await this.supabase.client
        .from('user_blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', targetUserId);

      if (error) {
        console.error('[BlockingService] delete block error', error);
        this.toast.error('messages.errorUnblock');
        return false;
      }
      this.notifyChange();
      return true;
    }

    // Otherwise upsert
    const { error } = await this.supabase.client.from('user_blocks').upsert(
      {
        blocker_id: userId,
        blocked_id: targetUserId,
        block_messages: blockMessages,
        block_ascents: blockAscents,
      },
      { onConflict: 'blocker_id, blocked_id' },
    );

    if (error) {
      console.error('[BlockingService] upsert block error', error);
      this.toast.error('messages.errorBlock');
      return false;
    }

    this.notifyChange();
    return true;
  }
}
