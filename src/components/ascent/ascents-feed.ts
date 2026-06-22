import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { AscentCardComponent } from './ascent-card';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';
import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';

import {
  FeedItem,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../../models';

export interface ProcessedFeedItem {
  item: FeedItem;
  index: number;
  showRowBreak: boolean;
  showGradeHeader: boolean;
  gradeLabel?: string;
  isFollowed: boolean;
}

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
      [class.md:grid-cols-2]="columns() >= 2"
      [class.lg:grid-cols-3]="columns() >= 3"
    >
      @for (
        processed of processedItems();
        track processed.item.id || processed.index
      ) {
        @if (processed.showRowBreak) {
          <div
            [class.md:col-span-2]="columns() >= 2"
            [class.lg:col-span-3]="columns() >= 3"
          ></div>
        }
        @if (processed.item.kind === 'news') {
          <app-news-card
            [item]="processed.item"
            [class.md:col-span-2]="columns() >= 2"
            [class.lg:col-span-3]="columns() >= 3"
          />
        } @else if (processed.item.kind === 'ascent') {
          @let ascent = processed.item;
          @if (groupByGrade() && processed.showGradeHeader) {
            <div
              class="mt-10 mb-4 flex items-center gap-4"
              [class.md:col-span-2]="columns() >= 2"
              [class.lg:col-span-3]="columns() >= 3"
            >
              <span class="text-2xl font-black shrink-0">
                {{ processed.gradeLabel }}
              </span>
              <div class="h-px grow bg-(--tui-border-normal)"></div>
            </div>
          }
          @if (processed.index === 0) {
            <app-ascent-card
              [data]="ascent"
              [showUser]="showUser()"
              [showRoute]="showRoute()"
              [isFollowed]="processed.isFollowed"
              [priority]="true"
              (followEvent)="follow.emit($event)"
              (unfollowEvent)="unfollow.emit($event)"
            />
          } @else {
            @defer (on viewport) {
              <app-ascent-card
                [data]="ascent"
                [showUser]="showUser()"
                [showRoute]="showRoute()"
                [isFollowed]="processed.isFollowed"
                [priority]="false"
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
          [class.md:col-span-2]="columns() >= 2"
          [class.lg:col-span-3]="columns() >= 3"
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

  protected readonly processedItems = computed<ProcessedFeedItem[]>(() => {
    const list = this.ascents();
    const groupByGrade = this.groupByGrade();
    const followed = this.followedIds();

    return list.map((item, index) => {
      let showRowBreak = false;
      let showGradeHeader = false;
      let isFollowed = false;
      let gradeLabel = '';

      if (item.kind === 'ascent') {
        isFollowed = followed.has(item.user_id);

        if (groupByGrade) {
          const grade = item.grade ?? item.route?.grade;
          if (grade !== null && grade !== undefined) {
            if (index === 0) {
              showGradeHeader = true;
            } else {
              const prev = list[index - 1];
              if (prev.kind === 'news') {
                showGradeHeader = true;
              } else {
                const prevGrade = prev.grade ?? prev.route?.grade;
                showGradeHeader = grade !== prevGrade;
              }
            }
            gradeLabel =
              GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
              grade.toString() ||
              '';
          }
        }
      }

      if (!groupByGrade && index > 0) {
        const prev = list[index - 1];
        if (item.date && prev.date) {
          const currentDateStr = item.date.substring(0, 10);
          const prevDateStr = prev.date.substring(0, 10);
          showRowBreak = currentDateStr !== prevDateStr;
        }
      }

      return {
        item,
        index,
        showRowBreak,
        showGradeHeader,
        gradeLabel,
        isFollowed,
      };
    });
  });
}
