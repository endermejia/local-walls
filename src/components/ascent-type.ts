import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import {
  TuiHint,
  TuiIcon,
  TuiSizeL,
  TuiSizeS,
  TuiSizeXS,
} from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentsService } from '../services/ascents.service';

import { AscentType } from '../models';

@Component({
  selector: 'app-ascent-type',
  standalone: true,
  imports: [TuiBadge, TuiIcon, TuiHint, TranslatePipe],
  template: `
    @let info = typeInfo();
    <tui-badge
      [size]="badgeSize()"
      [style.background]="info.background"
      class="!text-[var(--tui-text-primary-on-accent-1)] !rounded-full"
      [tuiHint]="hasAttempts() ? hintTemplate : null"
    >
      <tui-icon [icon]="info.icon" />
      <span class="ml-1 uppercase font-bold">
        {{ 'ascentTypes.' + (type() || 'rp') | translate }}
      </span>
    </tui-badge>

    <ng-template #hintTemplate>
      {{ attempts() }}
      {{ (attempts() === 1 ? 'attempt' : 'attempts') | translate }}
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentTypeComponent {
  private readonly ascentsService = inject(AscentsService);

  type = input.required<AscentType | null | undefined>();
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS>('l');
  attempts = input<number | null | undefined>(null);

  protected readonly typeInfo = computed(() => {
    const type = this.type() || 'default';
    return this.ascentsService.ascentInfo()[type];
  });

  protected readonly badgeSize = computed<TuiSizeS | TuiSizeL>(() => {
    const size = this.size();
    if (size === 'xs') return 's';
    return size as TuiSizeS | TuiSizeL;
  });

  protected readonly hasAttempts = computed(() => {
    const attempts = this.attempts();
    return (attempts ?? 0) > 0;
  });
}
