import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  FeedItem,
  NewsItem,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../models';

import { AscentCardComponent } from './ascent-card';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';
import { InfiniteScrollTriggerComponent } from './infinite-scroll-trigger';
import { NewsCardComponent } from './news-card';

@Component({
  selector: 'app-ascents-feed',
  imports: [
    AscentCardComponent,
    AscentCardSkeletonComponent,
    CommonModule,
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
  ],
  template: `
    <div
      class="grid gap-6 mt-4"
      [class.grid-cols-1]="true"
      [class.xl:grid-cols-2]="columns() >= 2"
    >
      @for (item of ascents(); track item.id) {
        @if (item.kind === 'news') {
          <app-news-card
            [item]="asNews(item)"
            [class.xl:col-span-2]="columns() >= 2"
          />
        } @else {
          @let ascent = asAscent(item);
          @if (groupByGrade()) {
            @let grade = ascent.grade ?? ascent.route?.grade;
            @if (
              grade !== null &&
              grade !== undefined &&
              showGradeHeader(ascent, $index)
            ) {
              <div
                class="mt-10 mb-4 flex items-center gap-4"
                [class.xl:col-span-2]="columns() >= 2"
              >
                <span class="text-2xl font-black shrink-0">
                  {{ gradeLabelByNumber[asGrade(grade)] }}
                </span>
                <div class="h-px grow bg-[var(--tui-border-normal)]"></div>
              </div>
            }
          }
          @defer (on viewport) {
            <app-ascent-card
              [data]="ascent"
              [showUser]="showUser()"
              [showRoute]="showRoute()"
              [isFollowed]="followedIds().has(ascent.user_id)"
              [priority]="$index === 0"
              (followEvent)="follow.emit($event)"
              (unfollowEvent)="unfollow.emit($event)"
            />
          } @placeholder {
            <app-ascent-card-skeleton
              [showUser]="showUser()"
              [showRoute]="showRoute()"
              [hasPhoto]="!!ascent.photo_path"
            />
          }
        }
      }

      @if (isLoading()) {
        @for (_ of [1, 2, 3, 4]; track $index) {
          <app-ascent-card-skeleton
            [showUser]="showUser()"
            [showRoute]="showRoute()"
          />
        }
      }

      @if (ascents().length > 0 && !isLoading() && hasMore()) {
        <div
          class="flex justify-center py-4"
          [class.xl:col-span-2]="columns() >= 2"
        >
          <app-infinite-scroll-trigger (intersect)="loadMore.emit()" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentsFeedComponent {
  ascents = input.required<FeedItem[]>();
  groupByGrade = input(false);
  isLoading = input(false);
  hasMore = input(false);
  showUser = input(true);
  showRoute = input(true);
  followedIds = input<Set<string>>(new Set());
  columns = input<number>(1);

  loadMore = output<void>();
  follow = output<string>();
  unfollow = output<string>();

  protected readonly gradeLabelByNumber = GRADE_NUMBER_TO_LABEL;

  protected asGrade(grade: number): VERTICAL_LIFE_GRADES {
    return grade as VERTICAL_LIFE_GRADES;
  }

  protected asAscent(item: FeedItem): RouteAscentWithExtras {
    return item as RouteAscentWithExtras;
  }

  protected asNews(item: FeedItem): NewsItem {
    return item as NewsItem;
  }

  protected showGradeHeader(
    ascent: RouteAscentWithExtras,
    index: number,
  ): boolean {
    if (index === 0) return true;
    const prev = this.ascents()[index - 1];
    if (prev.kind === 'news') return true;

    const currentGrade = ascent.grade ?? ascent.route?.grade;
    const prevGrade = prev.grade ?? prev.route?.grade;
    return currentGrade !== prevGrade;
  }
}
