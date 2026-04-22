import { inject, Injectable } from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import {
  FilterDialog,
  FilterDialogComponent,
} from '../components/dialogs/filter-dialog';

import { ORDERED_GRADE_VALUES } from '../models';

import { GlobalData } from './global-data';

import { clamp } from '../utils';

@Injectable({ providedIn: 'root' })
export class FiltersService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly global = inject(GlobalData);

  openFilters(
    options: {
      showShade?: boolean;
      showCategories?: boolean;
      showGradeRange?: boolean;
    } = {},
  ): void {
    const data: FilterDialog = {
      categories: this.global.areaListCategories(),
      gradeRange: this.global.areaListGradeRange(),
      selectedShade: this.global.areaListShade(),
      showCategories: options.showCategories ?? true,
      showShade: options.showShade ?? true,
      showGradeRange: options.showGradeRange ?? true,
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

      this.global.areaListGradeRange.set([Math.min(lo, hi), Math.max(lo, hi)]);

      this.global.areaListCategories.set(result.categories ?? []);
      this.global.areaListShade.set(result.selectedShade ?? []);
    });
  }
}
