import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiFallbackSrcPipe,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/experimental';
import { TuiAvatar, TuiBadgeNotification } from '@taiga-ui/kit';
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AppNotificationsService, SupabaseService } from '../services';
import { NotificationWithActor } from '../models';
import { EmptyStateComponent } from '../components/empty-state';
import { AscentDialogComponent } from './ascent-dialog';
import { ChatDialogComponent } from './chat-dialog';

interface GroupedNotification {
  id: string;
  type: string;
  resource_id?: string | number;
  resource_name?: string;
  actors: { name: string; avatar?: string | null }[];
  actor_id: string;
  created_at: string;
  read_at?: string;
  ids: string[];
  count: number;
  hasUnread: boolean;
}

@Component({
  selector: 'app-notifications-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    DatePipe,
    EmptyStateComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiButton,
    TuiFallbackSrcPipe,
    TuiLoader,
    TuiScrollbar,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <div
        class="flex justify-end items-center p-4 border-b border-[var(--tui-border-normal)]"
      >
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
          @for (group of groupedNotifications(); track group.id) {
            <button
              class="relative flex gap-3 p-4 border-b border-[var(--tui-border-normal)] last:border-0 text-left transition-colors w-full hover:bg-[var(--tui-background-neutral-1)]"
              (click)="onNotificationClick(group)"
            >
              <tui-avatar
                [src]="
                  supabase.buildAvatarUrl(group.actors[0].avatar)
                    | tuiFallbackSrc: '@tui.user'
                    | async
                "
                size="s"
              />
              <div class="flex flex-col grow min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <span class="text-sm">
                    <span class="font-bold">{{ getActorsText(group) }}</span>
                    {{
                      getNotificationText(group)
                        | translate: { routeName: group.resource_name || '' }
                    }}
                  </span>
                  <div class="flex flex-col items-end gap-1">
                    <span
                      class="text-[10px] opacity-50 whitespace-nowrap pt-0.5"
                    >
                      {{ group.created_at | date: 'd/M/yy, HH:mm' }}
                    </span>
                    @if (group.hasUnread) {
                      <tui-badge-notification tuiAppearance="accent" size="m">
                        {{ group.count }}
                      </tui-badge-notification>
                    }
                  </div>
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
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  protected readonly context = injectContext<TuiDialogContext<void, void>>();

  protected readonly notificationsResource = resource({
    loader: () => this.notificationsService.getNotifications(),
  });

  protected readonly groupedNotifications = computed(() => {
    const notifications = this.notificationsResource.value() ?? [];
    return this.groupNotifications(notifications);
  });

  protected readonly loading = computed(() =>
    this.notificationsResource.isLoading(),
  );

  protected readonly unreadCount = computed(
    () =>
      (this.notificationsResource.value() ?? []).filter((n) => !n.read_at)
        .length,
  );

  protected getNotificationText(group: GroupedNotification): string {
    switch (group.type) {
      case 'like':
        return group.count > 1
          ? 'notifications.likedAscentPlural'
          : 'notifications.likedAscent';
      case 'comment':
        return group.count > 1
          ? 'notifications.commentedAscentPlural'
          : 'notifications.commentedAscent';
      case 'message':
        return 'notifications.sentMessage';
      default:
        return 'notifications.unknown';
    }
  }

  protected getActorsText(group: GroupedNotification): string {
    const names = group.actors.map((a) => a.name);
    // Unique names
    const uniqueNames = [...new Set(names)];
    const count = uniqueNames.length;

    const formatter = new Intl.ListFormat(this.translate.currentLang || 'en', {
      style: 'long',
      type: 'conjunction',
    });

    if (count > 3) {
      const othersText = this.translate.instant('notifications.andOthers', {
        count: count - 2,
      });
      return formatter.format([...uniqueNames.slice(0, 2), othersText]);
    }

    return formatter.format(uniqueNames);
  }

  protected onMarkAllRead() {
    void this.notificationsService.markAllAsRead().then(() => {
      this.notificationsResource.reload();
    });
  }

  protected onNotificationClick(group: GroupedNotification) {
    // Mark all IDs in the group as read
    const unreadIds = group.ids.filter(
      (id) =>
        !this.notificationsResource
          .value()
          ?.find((n) => n.id === id)?.read_at,
    );

    if (unreadIds.length > 0) {
      // Parallel execution
      Promise.all(
        unreadIds.map((id) => this.notificationsService.markAsRead(id)),
      ).then(() => {
        this.notificationsResource.reload();
      });
    }

    if (group.type === 'like' || group.type === 'comment') {
      const ascentId = Number(group.resource_id);
      if (!isNaN(ascentId) && ascentId > 0) {
        this.openAscentDialog(ascentId);
      }
    } else if (group.type === 'message') {
      void firstValueFrom(
        this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
          label: this.translate.instant('nav.chat'),
          size: 'm',
          data: { userId: group.actor_id },
        }),
        { defaultValue: undefined },
      );
    }
  }

  private openAscentDialog(ascentId: number) {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(AscentDialogComponent), {
        label: this.translate.instant('labels.ascent'),
        size: 'm',
        data: { ascentId },
      }),
      { defaultValue: undefined },
    );
  }

  private groupNotifications(
    notifications: NotificationWithActor[],
  ): GroupedNotification[] {
    const groups: GroupedNotification[] = [];
    const processedIds = new Set<string>();

    for (const notif of notifications) {
      if (processedIds.has(notif.id)) continue;

      if (
        (notif.type === 'like' || notif.type === 'comment') &&
        notif.resource_id
      ) {
        // Group by type and resource_id
        const groupItems = notifications.filter(
          (n) =>
            !processedIds.has(n.id) &&
            n.type === notif.type &&
            n.resource_id === notif.resource_id,
        );

        const ids = groupItems.map((n) => n.id);
        ids.forEach((id) => processedIds.add(id));

        const hasUnread = groupItems.some((n) => !n.read_at);
        const newest = groupItems[0]; // Assuming input is sorted by date desc

        groups.push({
          id: newest.id,
          type: newest.type,
          resource_id: newest.resource_id ?? undefined,
          resource_name: newest.resource_name,
          actors: groupItems.map((n) => ({
            name: n.actor.name,
            avatar: n.actor.avatar,
          })),
          actor_id: newest.actor_id ?? '',
          created_at: newest.created_at ?? '',
          read_at: hasUnread ? undefined : (newest.read_at ?? undefined),
          ids,
          count: groupItems.length,
          hasUnread,
        });
      } else {
        processedIds.add(notif.id);
        groups.push({
          id: notif.id,
          type: notif.type,
          resource_id: notif.resource_id ?? undefined,
          resource_name: notif.resource_name,
          actors: [{ name: notif.actor.name, avatar: notif.actor.avatar }],
          actor_id: notif.actor_id ?? '',
          created_at: notif.created_at ?? '',
          read_at: notif.read_at ?? undefined,
          ids: [notif.id],
          count: 1,
          hasUnread: !notif.read_at,
        });
      }
    }

    // Ensure sorted by created_at desc
    return groups.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}

export default NotificationsDialogComponent;
