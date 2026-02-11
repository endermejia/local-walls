import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { AscentCardComponent } from './ascent-card';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';
import { InfiniteScrollTriggerComponent } from './infinite-scroll-trigger';

@Component({
  selector: 'app-ascents-feed',
  imports: [
    AscentCardComponent,
    AscentCardSkeletonComponent,
    CommonModule,
    InfiniteScrollTriggerComponent,
  ],
  template: `
    <div
      class="grid gap-6 mt-4"
      [class.grid-cols-1]="true"
      [class.xl:grid-cols-2]="columns() >= 2"
    >
      @for (ascent of ascents(); track ascent.id) {
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
  ascents = input.required<RouteAscentWithExtras[]>();
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

  protected readonly gradeLabelByNumber = VERTICAL_LIFE_TO_LABEL;

  protected asGrade(grade: number): VERTICAL_LIFE_GRADES {
    return grade as VERTICAL_LIFE_GRADES;
  }

  protected showGradeHeader(
    ascent: RouteAscentWithExtras,
    index: number,
  ): boolean {
    if (index === 0) return true;
    const prev = this.ascents()[index - 1];
    const currentGrade = ascent.grade ?? ascent.route?.grade;
    const prevGrade = prev.grade ?? prev.route?.grade;
    return currentGrade !== prevGrade;
  }
}
