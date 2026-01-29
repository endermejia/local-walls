import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiDialogContext, TuiDialogService } from '@taiga-ui/experimental';
import {
  TuiTextfield,
  TuiButton,
  TuiFallbackSrcPipe,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiAvatar, TuiConfirmData, TUI_CONFIRM } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { UserProfileDto } from '../models';

import { FollowsService, SupabaseService, AscentsService } from '../services';
import { EmptyStateComponent } from './empty-state';

export type UserListType = 'followers' | 'following' | 'ascent-likes';

export interface UserListDialogData {
  userId?: string;
  ascentId?: number;
  type: UserListType;
}

@Component({
  selector: 'app-user-list-dialog',
  imports: [
    AsyncPipe,
    RouterLink,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiLoader,
    TuiScrollbar,
    TranslatePipe,
    TuiTextfield,
    TuiLabel,
    EmptyStateComponent,
    WaIntersectionObserver,
    TuiButton,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <!-- Search Header -->
      <div class="sticky top-0 z-10">
        <tui-textfield
          [tuiTextfieldCleaner]="true"
          tuiTextfieldSize="m"
          class="w-full bg-[var(--tui-background-base)]"
        >
          <label tuiLabel for="user-search">
            {{ 'labels.search' | translate }}
          </label>
          <input
            tuiTextfield
            #userSearch
            id="user-search"
            autocomplete="off"
            [value]="query()"
            (input)="query.set(userSearch.value)"
          />
        </tui-textfield>
      </div>

      <tui-scrollbar waIntersectionRoot class="grow min-h-0">
        <div class="flex flex-col gap-1">
          @for (user of users(); track user.id) {
            <a
              class="flex items-center gap-3 p-3 hover:bg-neutral-pale transition-colors rounded-xl cursor-pointer"
              [routerLink]="['/profile', user.id]"
              (click)="context.completeWith(true)"
            >
              <tui-avatar
                [src]="
                  supabase.buildAvatarUrl(user.avatar)
                    | tuiFallbackSrc: '@tui.user'
                    | async
                "
                size="m"
              />
              <div class="flex flex-col grow min-w-0">
                <span class="font-bold text-text truncate">{{
                  user.name
                }}</span>
                @if (user.city) {
                  <span class="text-xs opacity-50 truncate">{{
                    user.city
                  }}</span>
                }
              </div>

              @if (user.id !== supabase.authUserId()) {
                @if (followedIds().has(user.id)) {
                  <button
                    tuiButton
                    appearance="secondary-grayscale"
                    size="s"
                    type="button"
                    (click)="onUnfollow(user, $event)"
                  >
                    {{ 'actions.following' | translate }}
                  </button>
                } @else {
                  <button
                    tuiButton
                    appearance="action"
                    size="s"
                    type="button"
                    (click)="onFollow(user, $event)"
                  >
                    {{ 'actions.follow' | translate }}
                  </button>
                }
              }
            </a>
          } @empty {
            @if (!loading()) {
              <div class="py-12">
                <app-empty-state />
              </div>
            }
          }

          @if (loading()) {
            <div class="p-8 flex justify-center items-center gap-3">
              <tui-loader />
              <span class="text-sm opacity-50">{{
                'actions.loading' | translate
              }}</span>
            </div>
          }

          @if (hasMore() && !loading()) {
            <div
              class="p-4 flex justify-center"
              waIntersectionObserver
              (waIntersectionObservee)="onIntersection($any($event))"
            >
              <tui-loader />
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListDialogComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly supabase = inject(SupabaseService);
  private readonly followsService = inject(FollowsService);
  private readonly ascentsService = inject(AscentsService);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, UserListDialogData>>();
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected readonly userId = this.context.data.userId;
  protected readonly ascentId = this.context.data.ascentId;
  protected readonly type = this.context.data.type;

  protected readonly query = signal('');
  protected readonly page = signal(0);
  protected readonly pageSize = 20;

  protected readonly followedIds = signal<Set<string>>(new Set());

  protected readonly usersResource = resource({
    params: () => ({
      userId: this.userId,
      ascentId: this.ascentId,
      type: this.type,
      query: this.query(),
      page: this.page(),
    }),
    loader: async ({ params }) => {
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

      switch (params.type) {
        case 'followers':
          if (!params.userId) return { items: [], total: 0 };
          return await this.followsService.getFollowersPaginated(
            params.userId,
            params.page,
            this.pageSize,
            params.query,
          );
        case 'following':
          if (!params.userId) return { items: [], total: 0 };
          return await this.followsService.getFollowingPaginated(
            params.userId,
            params.page,
            this.pageSize,
            params.query,
          );
        case 'ascent-likes':
          if (!params.ascentId) return { items: [], total: 0 };
          return await this.ascentsService.getLikesPaginated(
            params.ascentId,
            params.page,
            this.pageSize,
            params.query,
          );
        default:
          return { items: [], total: 0 };
      }
    },
  });

  protected readonly users = signal<UserProfileDto[]>([]);
  protected readonly total = computed(
    () => this.usersResource.value()?.total ?? 0,
  );
  protected readonly loading = computed(() => this.usersResource.isLoading());
  protected readonly hasMore = computed(
    () => this.users().length < this.total(),
  );

  constructor() {
    this.loadFollowedIds();

    // Reset users when query changes
    effect(() => {
      this.query();
      this.page.set(0);
      this.users.set([]);
    });

    // Append users when resource updates
    effect(() => {
      const res = this.usersResource.value();
      if (res && res.items.length > 0) {
        this.users.update((current) => {
          const currentIds = new Set(current.map((u) => u.id));
          const newItems = res.items.filter((u) => !currentIds.has(u.id));
          return [...current, ...newItems];
        });
      }
    });
  }

  onIntersection(entries: IntersectionObserverEntry[]) {
    if (entries[0].isIntersecting && this.hasMore() && !this.loading()) {
      this.page.update((p) => p + 1);
    }
  }

  protected async loadFollowedIds() {
    if (!isPlatformBrowser(this.platformId)) return;
    const ids = await this.followsService.getFollowedIds();
    this.followedIds.set(new Set(ids));
  }

  protected onFollow(user: UserProfileDto, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    void this.followsService.follow(user.id);
    // followedIds and followChange signal will be updated by followsService
    this.followedIds.update((ids) => {
      const next = new Set(ids);
      next.add(user.id);
      return next;
    });
  }

  protected async onUnfollow(user: UserProfileDto, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const data: TuiConfirmData = {
      content: this.translate.instant('actions.unfollowConfirm', {
        name: user.name,
      }),
      yes: this.translate.instant('actions.unfollow'),
      no: this.translate.instant('actions.cancel'),
      appearance: 'negative',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('actions.unfollow'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      const success = await this.followsService.unfollow(user.id);
      if (success) {
        this.followedIds.update((ids) => {
          const next = new Set(ids);
          next.delete(user.id);
          return next;
        });
        // If we are in the "following" list of our own profile, we might want to remove the user from the list
        // but the user didn't ask for that, they just asked for the button.
        // Usually, the button would change to "Follow" or the user would disappear.
        // For now, I'll just update followedIds which will change the button if it were Followers list.
        // In Following list, the button stays "Unfollow" unless we remove the user.
      }
    }
  }
}
