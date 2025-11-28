import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TuiBadge, TranslatePipe],
  template: `
    <header class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2">
        <tui-badge
          class="cursor-pointer"
          appearance="neutral"
          iconStart="@tui.chevron-left"
          size="xl"
          (click.zoneless)="back.emit()"
          [attr.aria-label]="'actions.back' | translate"
          [attr.title]="'actions.back' | translate"
        />
        <h1 class="text-2xl font-bold">{{ title() }}</h1>
      </div>
      <tui-badge
        class="cursor-pointer"
        [appearance]="liked() ? 'accent' : 'neutral'"
        iconStart="@tui.heart"
        size="xl"
        (click.zoneless)="toggleLike.emit()"
        [attr.aria-label]="
          (liked() ? 'actions.favorite.remove' : 'actions.favorite.add')
            | translate
        "
        [attr.title]="
          (liked() ? 'actions.favorite.remove' : 'actions.favorite.add')
            | translate
        "
      />
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  title = input.required<string>();
  liked = input(false);

  back = output<void>();
  toggleLike = output<void>();
}
