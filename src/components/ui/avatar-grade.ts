import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { TuiBadge } from '@taiga-ui/kit';
import { TuiHint, TuiSizeL, TuiSizeS, TuiSizeXS } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import {
  colorForGrade,
  GradeLabel,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  ClimbingKind,
  ClimbingKinds,
  getEquivalentGrade,
} from '../../models';

@Component({
  selector: 'app-grade',
  imports: [TranslatePipe, TuiBadge, TuiHint],
  template: `
    <span
      tuiBadge
      [size]="badgeSize()"
      class="self-center font-bold text-(--tui-text-primary-on-accent-1)! rounded-full! content-center"
      [style.background]="gradeColor()"
      [attr.aria-label]="'grade' | translate"
      [tuiHint]="hint()"
    >
      <strong class="text-shadow-sm">{{ gradeLabel() }}</strong>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeComponent {
  grade = input.required<number>();
  kind = input<ClimbingKind | null | undefined>(null);
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS>('l');

  protected readonly gradeLabel = computed(() => {
    const label =
      GRADE_NUMBER_TO_LABEL[this.grade() as VERTICAL_LIFE_GRADES] || '';
    if (this.kind() === ClimbingKinds.BOULDER) {
      return label.toUpperCase();
    }
    return label;
  });

  protected readonly secondaryGrade = computed(() => {
    return getEquivalentGrade(this.grade(), this.kind());
  });

  protected readonly hint = computed(() => {
    const primary = this.gradeLabel();
    const secondary = this.secondaryGrade();
    return secondary ? `${primary} / ${secondary}` : primary;
  });

  protected readonly gradeColor = computed(() => {
    return colorForGrade(this.gradeLabel() as GradeLabel);
  });

  protected readonly badgeSize = computed<TuiSizeS | TuiSizeL>(() => {
    const size = this.size();
    if (size === 'xs') return 's';
    return size as TuiSizeS | TuiSizeL;
  });
}
