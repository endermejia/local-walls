import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiIcon, TuiSizeL, TuiSizeS, TuiSizeXS } from '@taiga-ui/core';
import { AscentType } from '../models';
import { AscentsService } from '../services';

@Component({
  selector: 'app-avatar-ascent-type',
  imports: [TuiAvatar, TuiIcon],
  template: `
    @let info = typeInfo();
    <tui-avatar
      [size]="size()"
      class="!text-[var(--tui-text-primary-on-accent-1)]"
      [class.!text-[10px]]="size() === 'xs'"
      [style.background]="info.background"
    >
      <tui-icon [icon]="info.icon" />
    </tui-avatar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarAscentTypeComponent {
  private readonly ascentsService = inject(AscentsService);

  type = input.required<AscentType | null | undefined>();
  size = input<TuiSizeS | TuiSizeL | TuiSizeXS>('m');

  protected readonly typeInfo = computed(() => {
    const type = this.type() || 'default';
    return this.ascentsService.ascentInfo()[type];
  });
}
