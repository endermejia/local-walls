import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ORDERED_GRADE_VALUES } from '../models';

import { FilterDialog, FilterDialogComponent } from '../dialogs/filter-dialog';
import { GlobalData } from './global-data';

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
          label: this.translate.instant('labels.filters'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
    ).then((result) => {
      if (!result) return;

      const [a, b] = result.gradeRange ?? [0, ORDERED_GRADE_VALUES.length - 1];

      const clamp = (v: number) =>
        Math.max(0, Math.min(ORDERED_GRADE_VALUES.length - 1, Math.round(v)));

      const lo = clamp(a);
      const hi = clamp(b);

      this.global.areaListGradeRange.set([Math.min(lo, hi), Math.max(lo, hi)]);

      this.global.areaListCategories.set(result.categories ?? []);
      this.global.areaListShade.set(result.selectedShade ?? []);
    });
  }
}
