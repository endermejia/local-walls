import { isPlatformBrowser } from '@angular/common';
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

import { TuiButton, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { FollowRequestsService } from '../../services/follow-requests.service';
import { PopulatedFollowRequestDto } from '../../models';
import { SupabaseService } from '../../services/supabase.service';

import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-follow-requests-dialog',
  imports: [
    RouterLink,
    TuiAvatar,
    TuiLoader,
    TuiScrollbar,
    TranslatePipe,
    EmptyStateComponent,
    TuiButton,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="flex flex-col gap-1 p-4">
          @for (request of requests(); track request.id) {
            <a
              class="flex items-center gap-3 p-3 hover:bg-[var(--tui-background-neutral-1)] transition-colors rounded-xl cursor-pointer"
              [routerLink]="['/profile', request.follower_id]"
              (click)="context.completeWith(true)"
            >
              <span
                [tuiAvatar]="
                  supabase.buildAvatarUrl(request.follower.avatar) ||
                  '@tui.user'
                "
                size="m"
              ></span>
              <div class="flex flex-col grow min-w-0">
                <span class="font-bold text-text truncate">{{
                  request.follower.name
                }}</span>
                @if (request.follower.city) {
                  <span class="text-xs opacity-50 truncate">{{
                    request.follower.city
                  }}</span>
                }
              </div>

              <div class="flex gap-2">
                <button
                  tuiButton
                  appearance="primary"
                  size="s"
                  type="button"
                  [disabled]="loadingAction() === 'accept-' + request.id"
                  (click)="onAccept(request, $event)"
                >
                  {{ 'accept' | translate }}
                </button>
                <button
                  tuiButton
                  appearance="secondary-destructive"
                  size="s"
                  type="button"
                  [disabled]="loadingAction() === 'reject-' + request.id"
                  (click)="onReject(request, $event)"
                >
                  {{ 'reject' | translate }}
                </button>
              </div>
            </a>
          } @empty {
            @if (!loading()) {
              <div class="py-12">
                <app-empty-state icon="@tui.users" />
              </div>
            }
          }

          @if (loading()) {
            <div class="p-8 flex justify-center items-center gap-3">
              <tui-loader />
              <span class="text-sm opacity-50">{{
                'loading' | translate
              }}</span>
            </div>
          }

          @if (hasMore() && !loading()) {
            <div class="p-4 flex justify-center text-sm opacity-50">
              {{ 'loading' | translate }}
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowRequestsDialogComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly supabase = inject(SupabaseService);
  private readonly followRequestsService = inject(FollowRequestsService);
  protected readonly context = injectContext<TuiDialogContext<boolean, void>>();
  private readonly translate = inject(TranslateService);

  protected readonly page = signal(0);
  protected readonly pageSize = 20;

  protected readonly loadingAction = signal<string | null>(null);

  protected readonly requestsResource = resource({
    params: () => ({
      page: this.page(),
      change: this.followRequestsService.requestsChange(),
    }),
    loader: async ({ params }) => {
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

      return await this.followRequestsService.getIncomingRequestsPaginated(
        params.page,
        this.pageSize,
      );
    },
  });

  protected readonly requests = signal<PopulatedFollowRequestDto[]>([]);
  protected readonly total = computed(
    () => this.requestsResource.value()?.total ?? 0,
  );
  protected readonly loading = computed(() =>
    this.requestsResource.isLoading(),
  );
  protected readonly hasMore = computed(
    () => this.requests().length < this.total(),
  );

  constructor() {
    // Append requests when resource updates
    effect(() => {
      const res = this.requestsResource.value();
      if (res && res.items.length > 0) {
        this.requests.update((current) => {
          const currentIds = new Set(current.map((u) => u.id));
          const newItems = res.items.filter((u) => !currentIds.has(u.id));
          return [...current, ...newItems];
        });
      }
    });

    effect(() => {
      // Clear data if we refresh from page 0
      if (this.page() === 0) {
        this.requests.set([]);
      }
    });
  }

  onIntersection(entries: IntersectionObserverEntry[]) {
    if (entries[0].isIntersecting && this.hasMore() && !this.loading()) {
      this.page.update((p) => p + 1);
    }
  }

  protected async onAccept(request: PopulatedFollowRequestDto, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.loadingAction()) return;
    this.loadingAction.set('accept-' + request.id);

    try {
      const success = await this.followRequestsService.acceptRequest(
        request.id,
      );
      if (success) {
        // Remove from list
        this.requests.update((list) => list.filter((r) => r.id !== request.id));
      }
    } finally {
      this.loadingAction.set(null);
    }
  }

  protected async onReject(request: PopulatedFollowRequestDto, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.loadingAction()) return;
    this.loadingAction.set('reject-' + request.id);

    try {
      const success = await this.followRequestsService.rejectRequest(
        request.id,
      );
      if (success) {
        // Remove from list
        this.requests.update((list) => list.filter((r) => r.id !== request.id));
      }
    } finally {
      this.loadingAction.set(null);
    }
  }
}
