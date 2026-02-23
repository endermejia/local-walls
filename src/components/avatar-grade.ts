import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { TuiSizeL, TuiSizeS, TuiSizeXS } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  colorForGrade,
  GradeLabel,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

@Component({
  selector: 'app-grade',
  imports: [TuiBadge, TranslatePipe],
  template: `
    <tui-badge
      [size]="badgeSize()"
      class="self-center font-bold select-none !text-[var(--tui-text-primary-on-accent-1)] !rounded-full"
      [style.background]="getGradeColor()"
      [attr.aria-label]="'labels.grade' | translate"
    >
      <strong>{{ gradeLabel() }}</strong>
    </tui-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeComponent {
  grade = input.required<number>();
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS>('l');

  protected readonly gradeLabel = computed(() => {
    const g = this.grade();
    return (
      VERTICAL_LIFE_TO_LABEL[g as VERTICAL_LIFE_GRADES] || g?.toString() || ''
    );
  });

  protected readonly badgeSize = computed<TuiSizeS | TuiSizeL>(() => {
    const size = this.size();
    if (size === 'xs') return 's';
    return size as TuiSizeS | TuiSizeL;
  });

  protected getGradeColor(): string {
    const label = this.gradeLabel();
    // Use '5' as fallback for color computation if label is not a standard one
    const colorLabel = VERTICAL_LIFE_TO_LABEL[
      this.grade() as VERTICAL_LIFE_GRADES
    ]
      ? label
      : '5';
    return colorForGrade(colorLabel as GradeLabel);
  }
}
