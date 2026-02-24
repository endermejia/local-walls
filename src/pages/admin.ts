import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiAvatarStack } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiAvatarStack,
    TuiHeader,
    TuiIcon,
    TuiTitle,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'config' | translate }}</h1>
      </header>

      <div class="grid gap-2">
        <a
          routerLink="/admin/users"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon icon="@tui.users" class="text-[var(--tui-text-tertiary)]" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-bold">{{ 'nav.admin-users' | translate }}</span>

              @if (usersSampleResource.value(); as users) {
                <tui-avatar-stack>
                  @for (user of users; track user.id) {
                    <tui-avatar
                      size="s"
                      [round]="true"
                      [src]="user.avatar_url"
                    />
                  }
                </tui-avatar-stack>
              }
            </div>
            <p class="text-sm text-[var(--tui-text-secondary)]">
              {{ 'admin.users.description' | translate }}
            </p>
          </div>
        </a>

        <a
          routerLink="/admin/unify"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon icon="@tui.copy" class="text-[var(--tui-text-tertiary)]" />
          <div class="flex-1">
            <span class="font-bold block">
              {{ 'admin.unifyTitle' | translate }}
            </span>
            <p class="text-sm text-[var(--tui-text-secondary)]">
              {{ 'admin.unifyDescription' | translate }}
            </p>
          </div>
        </a>

        <a
          routerLink="/admin/parkings"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon
            icon="@tui.map-pin"
            class="text-[var(--tui-text-tertiary)]"
          />
          <div class="flex-1">
            <span class="font-bold block">
              {{ 'nav.admin-parkings' | translate }}
            </span>
            <p class="text-sm text-[var(--tui-text-secondary)]">
              {{ 'admin.parkings.description' | translate }}
            </p>
          </div>
        </a>

        <a
          routerLink="/admin/equippers"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon
            icon="@tui.hammer"
            class="text-[var(--tui-text-tertiary)]"
          />
          <div class="flex-1">
            <span class="font-bold block">
              {{ 'nav.admin-equippers' | translate }}
            </span>
            <p class="text-sm text-[var(--tui-text-secondary)]">
              {{ 'admin.equippers.description' | translate }}
            </p>
          </div>
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly usersSampleResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];

      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('user_profiles')
          .select('id, avatar_url:avatar')
          .not('avatar', 'is', null)
          .limit(5);

        if (error) throw error;

        return (
          data?.map((u) => ({
            ...u,
            avatar_url: u.avatar_url
              ? this.supabase.buildAvatarUrl(u.avatar_url)
              : null,
          })) ?? []
        );
      } catch (e) {
        console.error('[AdminComponent] Error loading users sample', e);
        return [];
      }
    },
  });
}

export default AdminComponent;
