import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
} from '@angular/core';
import { TuiSkeleton } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TranslatePipe, TuiSkeleton, TuiButton],
  template: `
    <header
      class="flex items-start justify-between gap-2"
      [tuiSkeleton]="tuiSkeleton()"
    >
      <div class="flex items-center gap-2">
        <button
          size="s"
          appearance="neutral"
          iconStart="@tui.chevron-left"
          tuiIconButton
          type="button"
          class="!rounded-full"
          (click.zoneless)="back.emit()"
        >
          {{ 'actions.back' | translate }}
        </button>
        <h1 class="text-2xl font-bold">{{ title() }}</h1>
      </div>
      <button
        size="s"
        [appearance]="liked() ? 'accent' : 'neutral'"
        iconStart="@tui.heart"
        tuiIconButton
        type="button"
        class="!rounded-full"
        (click.zoneless)="toggleLike.emit()"
      >
        {{
          (liked() ? 'actions.favorite.remove' : 'actions.favorite.add')
            | translate
        }}
      </button>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  title = input.required<string>();
  liked = input(false);
  tuiSkeleton: InputSignal<boolean> = input(false);

  back = output<void>();
  toggleLike = output<void>();
}
