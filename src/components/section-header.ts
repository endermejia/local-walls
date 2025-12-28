import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  output,
} from '@angular/core';
import { TuiSkeleton } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiHint } from '@taiga-ui/core';
import { GlobalData } from '../services';
import { Location } from '@angular/common';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TranslatePipe, TuiSkeleton, TuiButton, TuiHint],
  template: `
    <header
      class="flex items-start justify-between gap-2"
      [tuiSkeleton]="tuiSkeleton()"
    >
      <div class="flex items-center gap-2">
        <div class="hidden md:block">
          <button
            size="s"
            appearance="neutral"
            iconStart="@tui.chevron-left"
            tuiIconButton
            type="button"
            class="!rounded-full"
            [tuiHint]="global.isMobile() ? null : ('actions.back' | translate)"
            (click.zoneless)="onBack()"
          >
            {{ 'actions.back' | translate }}
          </button>
        </div>
        <h1 class="text-2xl font-bold">{{ title() }}</h1>
        <ng-content />
      </div>
      <button
        size="s"
        [appearance]="liked() ? 'accent' : 'neutral'"
        iconStart="@tui.heart"
        tuiIconButton
        type="button"
        class="!rounded-full"
        [tuiHint]="
          global.isMobile()
            ? null
            : ((liked() ? 'actions.favorite.remove' : 'actions.favorite.add')
              | translate)
        "
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
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  title = input.required<string>();
  liked = input(false);
  tuiSkeleton: InputSignal<boolean> = input(false);

  toggleLike = output<void>();

  onBack(): void {
    this.location.back();
  }
}
