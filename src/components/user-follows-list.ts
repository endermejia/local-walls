import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
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

import { TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiFallbackSrcPipe,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiIcon,
} from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import { TranslatePipe } from '@ngx-translate/core';
import { UserProfileDto } from '../models';

import { FollowsService, SupabaseService } from '../services';
import { EmptyStateComponent } from './empty-state';

@Component({
  selector: 'app-user-follows-list',
  standalone: true,
  imports: [
    AsyncPipe,
    LowerCasePipe,
    RouterLink,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiLoader,
    TuiScrollbar,
    TranslatePipe,
    TuiTextfield,
    TuiLabel,
    TuiIcon,
    EmptyStateComponent,
    WaIntersectionObserver,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <!-- Search Header -->
      <div
        class="p-4 border-b border-border-normal bg-neutral-pale sticky top-0 z-10"
      >
        <tui-textfield
          [tuiTextfieldCleaner]="true"
          tuiTextfieldSize="m"
          class="w-full"
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
        <div class="mt-2 text-xs opacity-50 px-1">
          {{ total() }}
          {{
            (type === 'followers' ? 'labels.followers' : 'labels.following')
              | translate
              | lowercase
          }}
        </div>
      </div>

      <tui-scrollbar waIntersectionRoot class="grow min-h-0">
        <div class="p-2 flex flex-col gap-1">
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
              <tui-icon icon="@tui.chevron-right" class="opacity-30" />
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
export class UserFollowsListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly supabase = inject(SupabaseService);
  private readonly followsService = inject(FollowsService);
  protected readonly context =
    injectContext<
      TuiDialogContext<
        boolean,
        { userId: string; type: 'followers' | 'following' }
      >
    >();

  protected readonly userId = this.context.data.userId;
  protected readonly type = this.context.data.type;

  protected readonly query = signal('');
  protected readonly page = signal(0);
  protected readonly pageSize = 20;

  protected readonly usersResource = resource({
    params: () => ({
      userId: this.userId,
      type: this.type,
      query: this.query(),
      page: this.page(),
    }),
    loader: async ({ params }) => {
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

      if (params.type === 'followers') {
        return await this.followsService.getFollowersPaginated(
          params.userId,
          params.page,
          this.pageSize,
          params.query,
        );
      } else {
        return await this.followsService.getFollowingPaginated(
          params.userId,
          params.page,
          this.pageSize,
          params.query,
        );
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
    // Reset users when query changes
    effect(
      () => {
        this.query();
        this.page.set(0);
        this.users.set([]);
      },
      { allowSignalWrites: true },
    );

    // Append users when resource updates
    effect(
      () => {
        const res = this.usersResource.value();
        if (res && res.items.length > 0) {
          this.users.update((current) => {
            const currentIds = new Set(current.map((u) => u.id));
            const newItems = res.items.filter((u) => !currentIds.has(u.id));
            return [...current, ...newItems];
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  onIntersection(entries: IntersectionObserverEntry[]) {
    if (entries[0].isIntersecting && this.hasMore() && !this.loading()) {
      this.page.update((p) => p + 1);
    }
  }
}
