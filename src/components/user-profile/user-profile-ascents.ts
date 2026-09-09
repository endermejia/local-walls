import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { TuiButton, TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FollowsService } from '../../services/follows.service';
import { ProfileDataService } from '../../services/profile-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import {
  FeedItem,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
  UserProfileDto,
} from '../../models';

import {
  processAscentsToFeed,
  reactToObservable,
  safeResourceValue,
} from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { AscentsFeedComponent } from '../ascent/ascents-feed';

import { EmptyStateComponent } from '../ui/empty-state';

import { UserProfileFiltersComponent } from './user-profile-filters';

@Component({
  selector: 'app-user-profile-ascents',
  standalone: true,
  imports: [
    AscentsFeedComponent,
    CommonModule,
    EmptyStateComponent,
    TranslatePipe,
    TuiButton,
    TuiScrollbar,
    UserProfileFiltersComponent,
  ],
  template: `
    @if (
      profileData.userTotalAscentsCountResource.isLoading() ||
      hasAscents() ||
      profileData.ascentsQuery() ||
      hasActiveFilters()
    ) {
      <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
        @if (!profileData.userTotalAscentsCountResource.isLoading()) {
          <app-user-profile-filters />
        }

        <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
          <div class="w-full min-w-0 px-4 sm:px-0 pb-6">
            <app-ascents-feed
              [ascents]="accumulatedAscents()"
              [isLoading]="
                isLoading() ||
                ascentsResource.isLoading() ||
                profileData.userTotalAscentsCountResource.isLoading()
              "
              [hasMore]="hasMore()"
              [showUser]="false"
              [followedIds]="followedIds()"
              [columns]="1"
              [groupByGrade]="profileData.ascentsSort() === 'grade'"
              (loadMore)="loadMore()"
              (follow)="onFollow($event)"
              (unfollow)="onUnfollow($event)"
            />
          </div>
        </tui-scrollbar>
      </div>
    } @else if (isOwnProfile()) {
      <div class="mt-8 flex flex-col items-center gap-4">
        <button
          tuiButton
          type="button"
          appearance="secondary"
          iconStart="@tui.download"
          (click.zoneless)="openImport8aDialog()"
        >
          {{ 'import' | translate }} 8a.nu
        </button>
      </div>
    } @else {
      <div class="flex flex-col items-center gap-3">
        <app-empty-state icon="@tui.list" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 lg:flex lg:flex-col lg:h-full lg:min-h-0',
  },
})
export class UserProfileAscentsComponent {
  userId = input.required<string>();
  isOwnProfile = input(false);
  profile = input<UserProfileDto | null | undefined>();

  private readonly ascentsService = inject(AscentsService);
  protected readonly profileData = inject(ProfileDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly followsService = inject(FollowsService);
  protected readonly userProfilesService = inject(UserProfilesService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly selectedGradeRange =
    this.filterState.profileAscentsGradeRange;
  protected readonly selectedCategories =
    this.filterState.profileAscentsCategories;
  protected readonly showIndoor = this.filterState.profileAscentsShowIndoor;
  protected readonly showOutdoor = this.filterState.profileAscentsShowOutdoor;

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    const categoriesActive = this.selectedCategories().length > 0;
    const indoor = this.showIndoor();
    const outdoor = this.showOutdoor();
    const indoorOutdoorActive = (indoor || outdoor) && !(indoor && outdoor);
    return gradeActive || categoriesActive || indoorOutdoorActive;
  });

  protected readonly accumulatedAscents = signal<FeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly followedIds = signal<Set<string>>(new Set());

  readonly ascentsResource = this.profileData.userAscentsResource;
  readonly totalAscents = computed(
    () =>
      safeResourceValue(this.ascentsResource, { items: [], total: 0 }).total ??
      0,
  );
  readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });
  readonly hasAscents = computed(() => {
    const count = safeResourceValue(
      this.profileData.userTotalAscentsCountResource,
      undefined,
    );
    return count !== undefined && count !== 0;
  });

  constructor() {
    effect(() => {
      this.followsService.followChange();
      if (this.isBrowser) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
      }
    });

    reactToObservable(this.ascentsService.ascentDeleted, (id) => {
      this.accumulatedAscents.update((items) =>
        items.filter((item) => String(item.id) !== String(id)),
      );
    });

    reactToObservable(
      this.ascentsService.ascentUpdated,
      async ({ id, changes }) => {
        const updated = await this.ascentsService.getAscentById(id);
        this.accumulatedAscents.update((items) => {
          const mapped = items.map((item) =>
            String(item.id) === String(id)
              ? ({ ...item, ...(updated || changes) } as RouteAscentWithExtras)
              : (item as RouteAscentWithExtras),
          );
          return processAscentsToFeed(mapped);
        });
      },
    );

    reactToObservable(this.ascentsService.ascentCreated, () => {
      this.profileData.ascentsPage.set(0);
      this.profileData.userAscentsResource.reload();
      this.profileData.userTotalAscentsCountResource.reload();
    });

    effect(() => {
      const res = this.ascentsResource.value();
      if (res) {
        const page = untracked(() => this.profileData.ascentsPage());
        if (page === 0) {
          const processed = processAscentsToFeed(res.items);
          this.accumulatedAscents.set(processed);
        } else {
          this.accumulatedAscents.update((prev) => {
            const prevAscents = prev as RouteAscentWithExtras[];
            const existingIds = new Set(prevAscents.map((a) => String(a.id)));
            const newItems = res.items.filter(
              (item) => !existingIds.has(String(item.id)),
            );
            return processAscentsToFeed([...prevAscents, ...newItems]);
          });
        }
        this.isLoading.set(false);
      } else if (this.ascentsResource.error()) {
        this.isLoading.set(false);
      }
    });

    effect(() => {
      this.profileData.ascentsQuery();
      this.profileData.ascentsSort();
      this.selectedGradeRange();
      this.selectedCategories();
      this.showIndoor();
      this.showOutdoor();
      this.profileData.ascentsDateFilter();

      this.isLoading.set(true);
      this.profileData.ascentsPage.set(0);
    });
  }

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.profileData.ascentsPage.update((p) => p + 1);
    }
  }

  onFollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  onUnfollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  protected openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }
}
