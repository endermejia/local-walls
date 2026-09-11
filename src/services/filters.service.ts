import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import {
  FilterDialog,
  FilterDialogComponent,
} from '../components/dialogs/filter-dialog';

import { ORDERED_GRADE_VALUES } from '../models';

import { clamp } from '../utils';

import { FilterStateService } from './filter-state.service';

@Injectable({ providedIn: 'root' })
export class FiltersService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly filterState = inject(FilterStateService);

  openFilters(
    options: {
      showShade?: boolean;
      showCategories?: boolean;
      showGradeRange?: boolean;
      showIndoorOutdoor?: boolean;
      showToposOnly?: boolean;
    } = {},
  ): void {
    const data: FilterDialog = {
      categories: this.filterState.areaListCategories(),
      gradeRange: this.filterState.areaListGradeRange(),
      selectedShade: this.filterState.areaListShade(),
      indoor: this.filterState.areaListShowIndoor(),
      outdoor: this.filterState.areaListShowOutdoor(),
      toposOnly: this.filterState.areaListToposOnly(),
      showCategories: options.showCategories ?? true,
      showShade: options.showShade ?? true,
      showGradeRange: options.showGradeRange ?? true,
      showIndoorOutdoor: options.showIndoorOutdoor ?? false,
      showToposOnly: options.showToposOnly ?? false,
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

      const [a, b] = result.gradeRange ?? [0, ORDERED_GRADE_VALUES.length - 1];

      const lo = clamp(Math.round(a), 0, ORDERED_GRADE_VALUES.length - 1);
      const hi = clamp(Math.round(b), 0, ORDERED_GRADE_VALUES.length - 1);

      this.filterState.areaListGradeRange.set([
        Math.min(lo, hi),
        Math.max(lo, hi),
      ]);

      this.filterState.areaListCategories.set(result.categories ?? []);
      this.filterState.areaListShade.set(result.selectedShade ?? []);

      if (result.indoor !== undefined) {
        this.filterState.areaListShowIndoor.set(result.indoor);
      }
      if (result.outdoor !== undefined) {
        this.filterState.areaListShowOutdoor.set(result.outdoor);
      }
      if (result.toposOnly !== undefined) {
        this.filterState.areaListToposOnly.set(result.toposOnly);
      }
    });
  }

  openIndoorRouteFilters(): void {
    const data: FilterDialog = {
      categories: this.filterState.indoorRoutesCategories(),
      gradeRange: this.filterState.indoorRoutesGradeRange(),
      toposOnly: this.filterState.indoorRoutesToposOnly(),
      showCategories: true,
      showShade: false,
      showGradeRange: true,
      showIndoorOutdoor: false,
      showToposOnly: true,
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

      const [a, b] = result.gradeRange ?? [0, ORDERED_GRADE_VALUES.length - 1];

      const lo = clamp(Math.round(a), 0, ORDERED_GRADE_VALUES.length - 1);
      const hi = clamp(Math.round(b), 0, ORDERED_GRADE_VALUES.length - 1);

      this.filterState.indoorRoutesGradeRange.set([
        Math.min(lo, hi),
        Math.max(lo, hi),
      ]);

      this.filterState.indoorRoutesCategories.set(result.categories ?? []);

      if (result.toposOnly !== undefined) {
        this.filterState.indoorRoutesToposOnly.set(result.toposOnly);
      }
    });
  }
}
