import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TuiLoader } from '@taiga-ui/core';

import { RouteAscentWithExtras } from '../models';

import { AscentCardComponent } from './ascent-card';
import { InfiniteScrollTriggerComponent } from './infinite-scroll-trigger';

@Component({
  selector: 'app-ascents-feed',
  imports: [
    AscentCardComponent,
    CommonModule,
    InfiniteScrollTriggerComponent,
    TuiLoader,
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
        <div class="flex justify-center p-8">
          <tui-loader />
        </div>
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
