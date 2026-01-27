import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  output,
} from '@angular/core';

import { TuiItem } from '@taiga-ui/cdk';
import { TuiButton, TuiHint, TuiLink } from '@taiga-ui/core';
import { TuiBreadcrumbs, TuiSkeleton } from '@taiga-ui/kit';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiSkeleton,
    TuiButton,
    TuiHint,
    TuiBreadcrumbs,
    TuiLink,
    RouterLink,
    TuiItem,
  ],
  template: `
    <header
      class="flex items-start justify-between gap-2"
      [tuiSkeleton]="tuiSkeleton()"
    >
      <div class="flex flex-col gap-1 overflow-hidden">
        @let breadcrumbs = global.breadcrumbs();
        @if (breadcrumbs.length > 0) {
          <tui-breadcrumbs
            size="l"
            [itemsLimit]="global.isMobile() ? 2 : 10"
            ngSkipHydration
          >
            @for (item of breadcrumbs; track item.caption) {
              <a
                *tuiItem
                tuiLink
                [routerLink]="item.routerLink"
                class="text-xs opacity-60"
              >
                {{ item.caption | translate }}
              </a>
            }
          </tui-breadcrumbs>
        }
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold line-clamp-1">{{ title() }}</h1>
          <ng-content />
        </div>
      </div>
      @if (showLike()) {
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
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  title = input.required<string>();
  liked = input(false);
  showLike = input(true);
  tuiSkeleton: InputSignal<boolean> = input(false);

  toggleLike = output<void>();
}
