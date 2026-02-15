import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiSizeL, TuiSizeS, TuiSizeXS } from '@taiga-ui/core';

import { AscentType } from '../models';
import { AvatarAscentTypeComponent } from './avatar-ascent-type';

@Component({
  selector: 'app-ascent-type',
  standalone: true,
  imports: [AvatarAscentTypeComponent, TranslatePipe],
  template: `
    <div class="flex items-center gap-1">
      <app-avatar-ascent-type [type]="type()" [size]="size()" />
      <span
        class="px-2 py-0.5 bg-[var(--tui-background-neutral-1)] rounded text-[10px] uppercase font-bold"
      >
        {{ 'ascentTypes.' + (type() || 'rp') | translate }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentTypeComponent {
  type = input.required<AscentType | null | undefined>();
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS>('xs');
}
