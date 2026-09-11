import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiInput,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiDataListWrapper,
  TuiSelect,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { debounceTime, firstValueFrom, Subject } from 'rxjs';

import { FilterStateService } from '../../services/filter-state.service';
import { ProfileDataService } from '../../services/profile-data.service';

import { ORDERED_GRADE_VALUES } from '../../models';

import { getAscentDateFilterOptions } from '../../utils';

import { FilterDialog, FilterDialogComponent } from '../dialogs/filter-dialog';

@Component({
  selector: 'app-user-profile-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiInput,
    TuiLabel,
    TuiSelect,
    TuiTextfield,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col gap-2 mb-4 shrink-0 w-full min-w-0 px-4 lg:px-1 pt-2"
    >
      <!-- Primary Date Filter + Modal Filters Button -->
      <div class="flex items-center gap-2 w-full min-w-0">
        <tui-textfield
          class="grow min-w-0 font-bold"
          [tuiTextfieldCleaner]="false"
          [stringify]="dateValueContent"
          tuiTextfieldSize="l"
        >
          <input
            tuiSelect
            id="date-filter"
            class="font-bold!"
            [ngModel]="dateFilterValue()"
            (ngModelChange)="dateFilterValue.set($event)"
            autocomplete="off"
          />
          <tui-data-list *tuiDropdown>
            <tui-data-list-wrapper new [items]="dateFilterOptions()" />
          </tui-data-list>
        </tui-textfield>

        <tui-badged-content class="shrink-0">
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
      </div>

      <!-- Search Query + Sort By -->
      <div class="flex flex-wrap items-center gap-2 w-full min-w-0">
        <tui-textfield
          class="grow min-w-0 basis-44"
          [tuiTextfieldCleaner]="true"
          tuiTextfieldSize="l"
        >
          <label tuiLabel for="route-search">{{
            'searchPlaceholder' | translate
          }}</label>
          <input
            tuiInput
            #routeSearch
            id="route-search"
            autocomplete="off"
            [value]="query()"
            (input.zoneless)="onQuery(routeSearch.value)"
          />
        </tui-textfield>

        <tui-textfield
          class="grow min-w-0 basis-32 sm:basis-36"
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
            [ngModel]="sortFilterValue()"
            (ngModelChange)="sortFilterValue.set($event)"
            autocomplete="off"
          />
          <tui-data-list *tuiDropdown>
            <tui-data-list-wrapper [items]="['grade', 'date']" />
          </tui-data-list>
        </tui-textfield>
      </div>
    </div>
  `,
})
export class UserProfileFiltersComponent {
  protected readonly profileData = inject(ProfileDataService);
  protected readonly filterState = inject(FilterStateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  private readonly querySubject = new Subject<string>();
  protected readonly query = toSignal(
    this.querySubject.pipe(debounceTime(400)),
    { initialValue: '' },
  );

  protected readonly sortFilterValue = linkedSignal<'grade' | 'date'>(() =>
    this.profileData.ascentsSort(),
  );

  protected readonly dateFilterValue = this.profileData.ascentsDateFilter;

  protected readonly dateFilterOptions = computed(() => {
    return getAscentDateFilterOptions(
      this.profileData.effectiveStartingClimbingYear(),
    );
  });

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

  protected readonly sortValueContent = (option: 'grade' | 'date'): string => {
    return this.translate.instant(
      option === 'grade' ? 'orderByGrade' : 'orderByDate',
    );
  };

  protected readonly dateValueContent = (option: string): string => {
    if (option === 'last12' || option === 'last_12_months') {
      return this.translate.instant('last12Months');
    }
    if (option === 'all' || option === 'all_time') {
      return this.translate.instant('allTime');
    }
    return option;
  };

  constructor() {
    effect(() => {
      const query = this.query();
      const sort = this.sortFilterValue();

      this.profileData.ascentsPage.set(0);
      this.profileData.ascentsQuery.set(query || null);
      this.profileData.ascentsSort.set(sort as 'grade' | 'date');
    });
  }

  onQuery(v: string) {
    this.querySubject.next(v);
  }

  protected openFilters(): void {
    const data: FilterDialog = {
      categories: this.filterState.profileAscentsCategories(),
      gradeRange: this.filterState.profileAscentsGradeRange(),
      showCategories: true,
      showGradeRange: true,
      showShade: false,
      showIndoorOutdoor: true,
      indoor: this.filterState.profileAscentsShowIndoor(),
      outdoor: this.filterState.profileAscentsShowOutdoor(),
    };

    void firstValueFrom(
      this.dialogs.open<FilterDialog>(
        new PolymorpheusComponent(FilterDialogComponent),
        {
          label: this.translate.instant('filters'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (!result) return;
      this.filterState.profileAscentsCategories.set(result.categories ?? []);
      if (result.gradeRange) {
        this.filterState.profileAscentsGradeRange.set(result.gradeRange);
      }
      if (result.indoor !== undefined) {
        this.filterState.profileAscentsShowIndoor.set(result.indoor);
      }
      if (result.outdoor !== undefined) {
        this.filterState.profileAscentsShowOutdoor.set(result.outdoor);
      }
    });
  }
}
