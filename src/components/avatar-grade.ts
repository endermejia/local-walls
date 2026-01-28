import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { TuiSizeL, TuiSizeS } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  colorForGrade,
  GradeLabel,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

@Component({
  selector: 'app-avatar-grade',
  imports: [TuiAvatar, TranslatePipe],
  template: `
    <tui-avatar
      tuiThumbnail
      [size]="size()"
      class="self-center font-semibold select-none !text-white"
      [style.background]="getGradeColor()"
      [attr.aria-label]="'labels.grade' | translate"
    >
      {{ gradeLabel() }}
    </tui-avatar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarGradeComponent {
  grade = input.required<number>();
  size = input<TuiSizeS | TuiSizeL>('m');

  protected readonly gradeLabel = computed(() => {
    const g = this.grade();
    return (
      VERTICAL_LIFE_TO_LABEL[g as VERTICAL_LIFE_GRADES] || g?.toString() || ''
    );
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
