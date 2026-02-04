import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TuiSkeleton } from '@taiga-ui/kit';

import {
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

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
        @if (groupByGrade()) {
          @let grade = ascent.grade ?? ascent.route?.grade;
          @if (
            grade !== null &&
            grade !== undefined &&
            showGradeHeader(ascent, $index)
          ) {
            <div class="mt-10 mb-4 flex items-center gap-4">
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
            (followEvent)="follow.emit($event)"
            (unfollowEvent)="unfollow.emit($event)"
          />
        } @placeholder {
          <div
            class="h-64 w-full bg-[var(--tui-background-neutral-1)] animate-pulse rounded-xl"
          ></div>
        }
      }

      @if (isLoading()) {
        @for (_ of [1, 2, 3]; track $index) {
          <div class="flex flex-col gap-4 p-4 rounded-3xl">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div [tuiSkeleton]="true" class="w-10 h-10 rounded-full"></div>
                <div class="flex flex-col gap-1">
                  <div [tuiSkeleton]="true" class="w-32 h-3 rounded-full"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-20 h-2 rounded-full opacity-60"
                  ></div>
                </div>
              </div>
              @if (showUser()) {
                <div
                  [tuiSkeleton]="true"
                  class="w-20 h-8 rounded-full opacity-50"
                ></div>
              }
            </div>

            <div class="flex flex-col gap-2">
              @if (showRoute()) {
                <div class="flex items-center gap-2">
                  <div [tuiSkeleton]="true" class="w-48 h-5 rounded-full"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-12 h-3 rounded-full opacity-50"
                  ></div>
                </div>
                <div class="flex items-center gap-2">
                  <div
                    [tuiSkeleton]="true"
                    class="w-8 h-4 rounded opacity-80"
                  ></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-16 h-3 rounded opacity-40"
                  ></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-24 h-3 rounded opacity-40"
                  ></div>
                </div>
              } @else {
                <div class="flex items-center gap-2">
                  <div
                    [tuiSkeleton]="true"
                    class="w-16 h-4 rounded opacity-80"
                  ></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-20 h-3 rounded opacity-40"
                  ></div>
                </div>
              }
            </div>

            <div
              [tuiSkeleton]="true"
              class="w-full h-4 rounded-full opacity-40 mt-1"
            ></div>
            <div
              [tuiSkeleton]="true"
              class="w-2/3 h-4 rounded-full opacity-40"
            ></div>

            <div class="flex gap-4 mt-2">
              <div
                [tuiSkeleton]="true"
                class="w-12 h-6 rounded-full opacity-50"
              ></div>
              <div
                [tuiSkeleton]="true"
                class="w-12 h-6 rounded-full opacity-50"
              ></div>
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
  groupByGrade = input(false);
  isLoading = input(false);
  hasMore = input(false);
  showUser = input(true);
  showRoute = input(true);
  followedIds = input<Set<string>>(new Set());

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
