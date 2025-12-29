import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TranslateService } from '@ngx-translate/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { FilterDialog, FilterDialogComponent } from '../pages/filter-dialog';
import { GlobalData } from './global-data';
import { ORDERED_GRADE_VALUES } from '../models';

@Injectable({ providedIn: 'root' })
export class FiltersService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly global = inject(GlobalData);

  openFilters(): void {
    const data: FilterDialog = {
      categories: this.global.areaListCategories(),
      gradeRange: this.global.areaListGradeRange(),
      selectedShade: this.global.areaListShade(),
      showCategories: true,
      showShade: true,
      showGradeRange: true,
    };

    this.dialogs
      .open<FilterDialog>(new PolymorpheusComponent(FilterDialogComponent), {
        label: this.translate.instant('labels.filters'),
        size: 'l',
        data,
      })
      .subscribe((result) => {
        if (!result) return;

        const [a, b] = result.gradeRange ?? [
          0,
          ORDERED_GRADE_VALUES.length - 1,
        ];

        const clamp = (v: number) =>
          Math.max(0, Math.min(ORDERED_GRADE_VALUES.length - 1, Math.round(v)));

        const lo = clamp(a);
        const hi = clamp(b);

        this.global.areaListGradeRange.set([
          Math.min(lo, hi),
          Math.max(lo, hi),
        ]);

        this.global.areaListCategories.set(result.categories ?? []);
        this.global.areaListShade.set(result.selectedShade ?? []);
      });
  }
}
