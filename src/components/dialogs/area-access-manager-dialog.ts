import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiAvatar, TuiConfirmData, TUI_CONFIRM } from '@taiga-ui/kit';
import {
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { EmptyStateComponent } from '../ui/empty-state';
import { AvatarUrlPipe } from '../../pipes';
import { handleErrorToast } from '../../utils';

interface AccessUser {
  purchaseId: string;
  userId: string;
  name: string | null;
  avatar: string | null;
  createdAt: string | null;
}

interface ProfileSearchResult {
  id: string;
  name: string | null;
  avatar: string | null;
}

@Component({
  selector: 'app-area-access-manager-dialog',
  imports: [
    CommonModule,
    FormsModule,
    AvatarUrlPipe,
    EmptyStateComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col h-[70dvh] min-h-[450px] -m-4">
      <!-- Search Input Section -->
      <div
        class="p-4 border-b border-(--tui-border-normal) bg-(--tui-background-neutral-1) flex flex-col gap-2"
      >
        <tui-textfield
          [tuiTextfieldCleaner]="true"
          tuiTextfieldSize="m"
          class="w-full bg-(--tui-background-base)"
        >
          <label tuiLabel for="user-grant-search">
            {{ 'areas.searchUser' | translate }}
          </label>
          <input
            tuiInput
            #grantSearch
            id="user-grant-search"
            autocomplete="off"
            [value]="searchQuery()"
            (input)="searchQuery.set(grantSearch.value)"
          />
        </tui-textfield>

        <!-- Search Results List -->
        @if (isSearching()) {
          <div class="flex items-center justify-center p-4">
            <tui-loader size="m" />
          </div>
        } @else if (searchResults(); as results) {
          @if (results.length > 0) {
            <div
              class="max-h-40 overflow-y-auto bg-(--tui-background-base) rounded-xl border border-(--tui-border-normal) shadow-sm flex flex-col p-1 gap-1"
            >
              @for (user of results; track user.id) {
                <div
                  class="flex items-center justify-between p-2 hover:bg-(--tui-background-neutral-1) rounded-lg transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span
                      tuiAvatar
                      size="s"
                      class="rounded-full overflow-hidden"
                      [attr.aria-label]="user.name || ''"
                    >
                      @if (user.avatar) {
                        <img
                          [src]="user.avatar | avatarUrl"
                          [alt]="user.name || ''"
                        />
                      } @else {
                        <tui-icon icon="@tui.user" />
                      }
                    </span>
                    <span class="text-sm font-semibold">{{
                      user.name || 'Anonymous'
                    }}</span>
                  </div>
                  <button
                    tuiButton
                    size="xs"
                    appearance="primary"
                    type="button"
                    (click)="grantAccess(user)"
                  >
                    {{ 'areas.grantAccess' | translate }}
                  </button>
                </div>
              }
            </div>
          }
        } @else if (searchQuery().trim().length >= 2) {
          <div class="text-xs opacity-60 text-center p-2">
            {{ 'areas.noUsersFound' | translate }}
          </div>
        }
      </div>

      <!-- Access List Section -->
      <tui-loader
        [loading]="accessListResource.isLoading()"
        class="grow min-h-0"
      >
        <tui-scrollbar class="h-full">
          <div class="p-4 flex flex-col gap-2">
            @for (user of accessList(); track user.purchaseId) {
              <div
                class="flex items-center justify-between p-3 bg-(--tui-background-base) border border-(--tui-border-normal) rounded-2xl"
              >
                <div class="flex items-center gap-3">
                  <span
                    tuiAvatar
                    size="m"
                    class="rounded-full overflow-hidden"
                    [attr.aria-label]="user.name || ''"
                  >
                    @if (user.avatar) {
                      <img
                        [src]="user.avatar | avatarUrl"
                        [alt]="user.name || ''"
                      />
                    } @else {
                      <tui-icon icon="@tui.user" />
                    }
                  </span>
                  <div class="flex flex-col">
                    <span class="font-bold text-sm leading-tight">{{
                      user.name || 'Anonymous'
                    }}</span>
                    @if (user.createdAt) {
                      <span class="text-[10px] opacity-50">{{
                        user.createdAt | date: 'shortDate'
                      }}</span>
                    }
                  </div>
                </div>
                <button
                  tuiButton
                  size="s"
                  appearance="negative"
                  type="button"
                  (click)="revokeAccess(user)"
                >
                  {{ 'areas.revokeAccess' | translate }}
                </button>
              </div>
            } @empty {
              <div class="py-8">
                <app-empty-state icon="@tui.users" />
              </div>
            }
          </div>
        </tui-scrollbar>
      </tui-loader>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaAccessManagerDialogComponent {
  readonly context =
    injectContext<
      TuiDialogContext<boolean, { areaId: number; areaName: string }>
    >();
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly areaId = this.context.data.areaId;
  readonly searchQuery = signal('');
  readonly isSearching = signal(false);

  // List of users who currently have access
  readonly accessListResource = resource({
    params: () => ({ areaId: this.areaId }),
    loader: async ({ params: { areaId } }): Promise<AccessUser[]> => {
      await this.supabase.whenReady();
      const { data: purchases, error: purchasesError } =
        await this.supabase.client
          .from('area_purchases')
          .select('id, user_id, created_at')
          .eq('area_id', areaId);

      if (purchasesError) {
        console.error(
          '[AreaAccessManager] Error loading access list',
          purchasesError,
        );
        throw purchasesError;
      }

      if (!purchases || purchases.length === 0) {
        return [];
      }

      const userIds = purchases.map((row) => row.user_id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[AreaAccessManager] Error loading user profiles',
          profilesError,
        );
        throw profilesError;
      }

      const profileMap = new Map<string, ProfileSearchResult>(
        (profiles || []).map((p) => [p.id, p]),
      );

      return purchases.map((row) => {
        const profile = profileMap.get(row.user_id);
        return {
          purchaseId: row.id,
          userId: row.user_id,
          name: profile?.name || null,
          avatar: profile?.avatar || null,
          createdAt: row.created_at,
        };
      });
    },
  });

  readonly accessList = computed(() => this.accessListResource.value() || []);

  // Search profiles that do NOT have access already
  readonly searchResults = resource({
    params: () => ({ query: this.searchQuery(), access: this.accessList() }),
    loader: async ({
      params: { query, access },
    }): Promise<ProfileSearchResult[]> => {
      const q = query.trim();
      if (q.length < 2) return [];

      this.isSearching.set(true);
      try {
        await this.supabase.whenReady();
        const existingUserIds = new Set(access.map((u) => u.userId));

        const { data, error } = await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .ilike('name', `%${q}%`)
          .limit(20);

        if (error) throw error;

        return (data || [])
          .filter((profile) => !existingUserIds.has(profile.id))
          .map((profile) => ({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
          }));
      } catch (err) {
        console.error('[AreaAccessManager] Profile search error', err);
        return [];
      } finally {
        this.isSearching.set(false);
      }
    },
  }).value;

  async grantAccess(user: ProfileSearchResult): Promise<void> {
    try {
      await this.supabase.whenReady();
      const { error } = await this.supabase.client
        .from('area_purchases')
        .insert({
          area_id: this.areaId,
          user_id: user.id,
          amount: 0,
          stripe_session_id: `admin-granted-${Date.now()}`,
        });

      if (error) throw error;

      this.toast.success('areas.accessGranted');
      this.searchQuery.set('');
      this.accessListResource.reload();
    } catch (err) {
      console.error('[AreaAccessManager] Error granting access', err);
      handleErrorToast(err, this.toast);
    }
  }

  async revokeAccess(user: AccessUser): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('areas.revokeAccess'),
        size: 's',
        data: {
          content: `${user.name || 'Anonymous'}`,
          yes: this.translate.instant('accept'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    try {
      await this.supabase.whenReady();
      const { error } = await this.supabase.client
        .from('area_purchases')
        .delete()
        .eq('id', user.purchaseId);

      if (error) throw error;

      this.toast.success('areas.accessRevoked');
      this.accessListResource.reload();
    } catch (err) {
      console.error('[AreaAccessManager] Error revoking access', err);
      handleErrorToast(err, this.toast);
    }
  }
}
