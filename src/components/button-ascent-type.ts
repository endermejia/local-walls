import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import {
  TuiButton,
  TuiIcon,
  TuiSizeL,
  TuiSizeS,
  TuiSizeXS,
} from '@taiga-ui/core';

import { AscentsService } from '../services/ascents.service';

import { AscentType } from '../models';

@Component({
  selector: 'app-button-ascent-type',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    @let info = typeInfo();
    <button
      tuiIconButton
      type="button"
      [size]="size()"
      class="transition-transform active:scale-95 !rounded-full"
      [style.background]="active() ? info.background : ''"
      [class.!text-[var(--tui-text-primary-on-accent-1)]]="active()"
      [appearance]="active() ? 'none' : 'neutral'"
    >
      <tui-icon [icon]="info.icon" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonAscentTypeComponent {
  private readonly ascentsService = inject(AscentsService);

  type = input.required<AscentType | null | undefined>();
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS | 'm'>('m');
  active = input<boolean>(false);

  protected readonly typeInfo = computed(() => {
    const type = this.type() || 'default';
    return this.ascentsService.ascentInfo()[type];
  });
}
