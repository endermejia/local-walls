import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TuiSkeleton } from '@taiga-ui/kit';

import { RouteAscentWithExtras } from '../models';

import { AscentCardComponent } from './ascent-card';
import { InfiniteScrollTriggerComponent } from './infinite-scroll-trigger';

@Component({
  selector: 'app-ascents-feed',
  imports: [
    AscentCardComponent,
    CommonModule,
    InfiniteScrollTriggerComponent,
    TuiSkeleton,
  ],
  template: `
    <div class="flex flex-col gap-6 mt-4">
      @for (ascent of ascents(); track ascent.id) {
        @defer (on viewport) {
          <app-ascent-card
            [data]="ascent"
            [showUser]="showUser()"
            [showRoute]="showRoute()"
            [isFollowed]="followedIds().has(ascent.user_id)"
            (followEvent)="follow.emit($event)"
            (unfollowEvent)="unfollow.emit($event)"
          />
        } @placeholder {
          <div class="h-64 w-full bg-gray-50 animate-pulse rounded-xl"></div>
        }
      }

      @if (isLoading()) {
        @for (_ of [1, 2, 3]; track $index) {
          <div class="flex flex-col gap-4 p-4 rounded-3xl bg-neutral-50 border border-black/5">
            <div class="flex items-center gap-3">
              <div [tuiSkeleton]="true" class="w-10 h-10 rounded-full"></div>
              <div class="flex flex-col gap-1">
                <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                <div [tuiSkeleton]="true" class="w-24 h-3"></div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <div [tuiSkeleton]="true" class="w-3/4 h-6"></div>
              <div [tuiSkeleton]="true" class="w-1/2 h-4"></div>
            </div>
            <div class="flex gap-4 mt-2">
              <div [tuiSkeleton]="true" class="w-16 h-8 rounded-full"></div>
              <div [tuiSkeleton]="true" class="w-16 h-8 rounded-full"></div>
            </div>
          </div>
        }
      }

      @if (ascents().length > 0 && !isLoading() && hasMore()) {
        <app-infinite-scroll-trigger (intersect)="loadMore.emit()" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentsFeedComponent {
  ascents = input.required<RouteAscentWithExtras[]>();
  isLoading = input(false);
  hasMore = input(false);
  showUser = input(true);
  showRoute = input(true);
  followedIds = input<Set<string>>(new Set());

  loadMore = output<void>();
  follow = output<string>();
  unfollow = output<string>();
}
