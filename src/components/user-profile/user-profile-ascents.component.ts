import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiDataListWrapper,
  TuiSelect,
} from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { startWith, firstValueFrom } from 'rxjs';

import { AscentsFeedComponent } from '../ascent/ascents-feed';
import { EmptyStateComponent } from '../ui/empty-state';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { FollowsService } from '../../services/follows.service';
import { FiltersService } from '../../services/filters.service';
import { UserProfilesService } from '../../services/user-profiles.service';
import { AscentCalendarDialogComponent } from '../../dialogs/ascent-calendar-dialog';
import { normalizeName } from '../../utils';
import {
  FeedItem,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
} from '../../models';

@Component({
  selector: 'app-user-profile-ascents',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiLabel,
    TuiSelect,
    TuiTextfield,
    TuiBadgedContent,
    TuiBadgeNotification,
    AscentsFeedComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (hasAscents() || query() || hasActiveFilters()) {
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <tui-textfield
            class="grow min-w-48"
            [tuiTextfieldCleaner]="true"
            tuiTextfieldSize="l"
          >
            <label tuiLabel for="route-search">{{
              'searchPlaceholder' | translate
            }}</label>
            <input
              tuiTextfield
              #routeSearch
              id="route-search"
              autocomplete="off"
              [value]="query()"
              (input.zoneless)="onQuery(routeSearch.value)"
            />
          </tui-textfield>

          <tui-badged-content>
            @if (hasActiveFilters()) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              />
            }
            <button
              tuiButton
              appearance="textfield"
              size="l"
              type="button"
              iconStart="@tui.sliders-horizontal"
              [attr.aria-label]="'filters' | translate"
              (click.zoneless)="openFilters()"
            ></button>
          </tui-badged-content>

          <tui-textfield
            class="w-full sm:w-48"
            [tuiTextfieldCleaner]="false"
            [stringify]="dateValueContent"
            tuiTextfieldSize="l"
          >
            <label tuiLabel for="date-filter">
              {{ 'filterByDate' | translate }}
            </label>
            <input
              tuiSelect
              id="date-filter"
              [formControl]="dateFilterControl"
              autocomplete="off"
            />
            <tui-data-list *tuiTextfieldDropdown>
              <tui-data-list-wrapper new [items]="dateFilterOptions()" />
            </tui-data-list>
          </tui-textfield>

          <tui-textfield
            class="w-full sm:w-48"
            [tuiTextfieldCleaner]="false"
            [stringify]="sortValueContent"
            tuiTextfieldSize="l"
          >
            <label tuiLabel for="sort-filter">
              {{ 'sortBy' | translate }}
            </label>
            <input
              tuiSelect
              id="sort-filter"
              [formControl]="sortFilterControl"
              autocomplete="off"
            />
            <tui-data-list *tuiTextfieldDropdown>
              <tui-data-list-wrapper new [items]="['grade', 'date']" />
            </tui-data-list>
          </tui-textfield>

          @if (hasAscents()) {
            <button
              tuiButton
              appearance="secondary"
              iconStart="@tui.calendar"
              class="w-full sm:w-auto sm:ml-auto"
              (click)="openCalendar()"
            >
              {{ 'statistics.openCalendar' | translate }}
            </button>
          }
        </div>

        <app-ascents-feed
          [ascents]="accumulatedAscents()"
          [isLoading]="isLoading() || ascentsResource.isLoading()"
          [hasMore]="hasMore()"
          [showUser]="false"
          [followedIds]="followedIds()"
          [columns]="2"
          [groupByGrade]="sortFilter() === 'grade'"
          (loadMore)="loadMore()"
          (follow)="onFollow($event)"
          (unfollow)="onUnfollow($event)"
        />
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
    class: 'block w-full min-w-0',
  },
})
export class UserProfileAscentsComponent {
  userId = input.required<string>();
  isOwnProfile = input(false);
  profile = input<any>();

  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly translate = inject(TranslateService);
  protected readonly followsService = inject(FollowsService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly userProfilesService = inject(UserProfilesService);
  protected readonly dialogs = inject(TuiDialogService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly query = signal('');
  protected readonly dateFilterControl = new FormControl<string>('last12', {
    nonNullable: true,
  });
  protected readonly dateFilter = toSignal(
    this.dateFilterControl.valueChanges.pipe(
      startWith(this.dateFilterControl.value),
    ),
    { initialValue: this.dateFilterControl.value },
  );

  protected readonly sortFilterControl = new FormControl<'grade' | 'date'>(
    this.global.ascentsSort(),
    {
      nonNullable: true,
    },
  );
  protected readonly sortFilter = toSignal(
    this.sortFilterControl.valueChanges.pipe(
      startWith(this.sortFilterControl.value),
    ),
    { initialValue: this.sortFilterControl.value },
  );

  protected readonly selectedGradeRange = this.global.areaListGradeRange;
  protected readonly selectedCategories = this.global.areaListCategories;

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  protected readonly dateFilterOptions = computed(() => {
    const years: string[] = [];
    const currentYear = new Date().getFullYear();
    const startingYear = this.profile()?.starting_climbing_year || 2020;
    const startYear = Math.min(2020, startingYear);
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y.toString());
    }
    return ['last12', 'all', ...years];
  });

  protected readonly dateValueContent = (option: string): string => {
    if (option === 'last12') {
      return this.translate.instant('last12Months');
    }
    if (option === 'all') {
      return this.translate.instant('allTime');
    }
    return option;
  };

  protected readonly sortValueContent = (option: 'grade' | 'date'): string => {
    return this.translate.instant(
      option === 'grade' ? 'orderByGrade' : 'orderByDate',
    );
  };

  protected readonly accumulatedAscents = signal<FeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly followedIds = signal<Set<string>>(new Set());

  readonly ascentsResource = this.global.userAscentsResource;
  readonly totalAscents = computed(
    () => this.ascentsResource.value()?.total ?? 0,
  );
  readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });
  readonly hasAscents = computed(
    () => this.global.userTotalAscentsCountResource.value() !== 0,
  );

  constructor() {
    effect(() => {
      this.followsService.followChange();
      if (isPlatformBrowser(this.platformId)) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
      }
    });

    effect(() => {
      const res = this.ascentsResource.value();
      if (res) {
        if (this.global.ascentsPage() === 0) {
          const processed = this.markDuplicates(res.items).map((i) => ({
            ...i,
            kind: 'ascent' as const,
          }));
          this.accumulatedAscents.set(processed);
        } else {
          this.accumulatedAscents.update((prev) => {
            const prevAscents = prev as RouteAscentWithExtras[];
            const processed = this.markDuplicates([
              ...prevAscents,
              ...res.items,
            ]).map((i) => ({
              ...i,
              kind: 'ascent' as const,
            }));
            return processed;
          });
        }
        this.isLoading.set(false);
      } else if (this.ascentsResource.error()) {
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const dateFilter = this.dateFilter();
      const query = this.query();
      const sort = this.sortFilter();
      this.selectedGradeRange();
      this.selectedCategories();

      this.isLoading.set(true);
      this.global.ascentsPage.set(0);

      this.global.ascentsDateFilter.set(dateFilter);
      this.global.ascentsQuery.set(query || null);
      this.global.ascentsSort.set(sort);
    });
  }

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.global.ascentsPage.update((p) => p + 1);
    }
  }

  onQuery(v: string) {
    this.query.set(v);
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

  openCalendar(): void {
    const userId = this.userId();
    this.dialogs
      .open(new PolymorpheusComponent(AscentCalendarDialogComponent), {
        label: this.translate.instant('ascents'),
        size: 'm',
        data: {
          userId,
          user: this.profile(),
        },
      })
      .subscribe();
  }

  protected openFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }

  protected openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }

  private markDuplicates(
    ascents: RouteAscentWithExtras[],
  ): RouteAscentWithExtras[] {
    const seen = new Set<string>();
    return ascents.map((a) => {
      const normalizedNameStr = normalizeName(a.route?.name);
      const key = `${a.date}|${normalizedNameStr}`;
      const isDuplicate = seen.has(key);
      if (!isDuplicate) {
        seen.add(key);
      }
      return { ...a, is_duplicate: isDuplicate };
    });
  }
}
