import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import {
  TuiButton,
  TuiFallbackSrcPipe,
  TuiLoader,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { TuiAvatar } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AppNotificationsService, SupabaseService } from '../services';
import { EmptyStateComponent } from './empty-state';

@Component({
  selector: 'app-notifications-dialog',
  standalone: true,
  imports: [
    EmptyStateComponent,
    TranslatePipe,
    TuiButton,
    TuiScrollbar,
    TuiLoader,
    TuiAvatar,
    TuiFallbackSrcPipe,
    AsyncPipe,
    DatePipe,
    CommonModule,
    TuiTitle
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <div class="flex justify-between items-center p-4 border-b border-[var(--tui-border-normal)]">
        <h2 tuiTitle>{{ 'labels.notifications' | translate }}</h2>
        <button
            tuiButton
            type="button"
            appearance="flat-grayscale"
            size="xs"
            (click)="onMarkAllRead()"
            [disabled]="unreadCount() === 0"
        >
            {{ 'actions.markAllRead' | translate }}
        </button>
      </div>

      <tui-scrollbar class="grow min-h-0">
        <div class="flex flex-col">
          @for (notif of notifications(); track notif.id) {
            <button
                class="flex gap-3 p-4 border-b border-[var(--tui-border-normal)] last:border-0 text-left hover:bg-[var(--tui-background-neutral-1)] transition-colors w-full"
                [class.bg-[var(--tui-background-accent-subtle)]]="!notif.read_at"
                (click)="onNotificationClick(notif)"
            >
              <tui-avatar
                [src]="supabase.buildAvatarUrl(notif.actor.avatar) | tuiFallbackSrc: '@tui.user' | async"
                size="s"
              />
              <div class="flex flex-col grow min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <span class="text-sm">
                    <span class="font-bold">{{ notif.actor.name }}</span>
                    {{ getNotificationText(notif) | translate }}
                  </span>
                  <span class="text-[10px] opacity-50 whitespace-nowrap pt-0.5">
                    {{ notif.created_at | date: 'd/M/yy, HH:mm' }}
                  </span>
                </div>
              </div>
            </button>
          } @empty {
            @if (!loading()) {
              <div class="py-20">
                <app-empty-state icon="@tui.bell" />
              </div>
            }
          }

          @if (loading()) {
            <div class="py-12 flex justify-center">
              <tui-loader />
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsDialogComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly notificationsService = inject(AppNotificationsService);
  protected readonly context = injectContext<TuiDialogContext<void, void>>();

  protected readonly notificationsResource = resource({
    loader: () => this.notificationsService.getNotifications(),
  });

  protected readonly notifications = computed(() => this.notificationsResource.value() ?? []);
  protected readonly loading = computed(() => this.notificationsResource.isLoading());
  protected readonly unreadCount = computed(() => this.notifications().filter(n => !n.read_at).length);

  protected getNotificationText(notif: any): string {
    switch (notif.type) {
        case 'like': return 'notifications.likedAscent';
        case 'comment': return 'notifications.commentedAscent';
        case 'message': return 'notifications.sentMessage';
        default: return 'notifications.unknown';
    }
  }

  protected onMarkAllRead() {
    void this.notificationsService.markAllAsRead().then(() => {
        this.notificationsResource.reload();
    });
  }

  protected onNotificationClick(notif: any) {
    if (!notif.read_at) {
        void this.notificationsService.markAsRead(notif.id).then(() => {
            this.notificationsResource.reload();
        });
    }
  }
}

export default NotificationsDialogComponent;
