import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  TemplateRef,
} from '@angular/core';

import { TuiItem } from '@taiga-ui/cdk';
import { TuiButton, TuiDropdown, TuiHint, TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiBreadcrumbs } from '@taiga-ui/kit';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-section-header',
  imports: [
    RouterLink,
    TranslatePipe,
    TuiBreadcrumbs,
    TuiButton,
    TuiDropdown,
    TuiHint,
    TuiIcon,
    TuiItem,
    TuiLink,
  ],
  template: `
    <header class="flex flex-col w-full">
      <!-- Breadcrumb -->
      @let breadcrumbs = global.slicedBreadcrumbs();
      @let isMobile = global.isMobile();

      <!-- Title row with actions -->
      <div class="flex items-start justify-between gap-3">
        <!-- Title and additional info -->
        <div class="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
          <h1 class="text-2xl font-bold line-clamp-1">
            @if (breadcrumbs.length) {
              <tui-breadcrumbs
                size="l"
                [itemsLimit]="isMobile && breadcrumbs.length > 1 ? 2 : 1"
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

            @if (titleDropdown(); as template) {
              <button
                tuiLink
                appearance="flat"
                type="button"
                class="!text-2xl !font-bold !text-inherit !no-underline"
                [tuiDropdown]="template"
              >
                {{ title() }}
                <tui-icon icon="@tui.chevron-down" class="ml-1" />
              </button>
            } @else {
              {{ title() }}
            }
          </h1>
          <!-- Additional title info (e.g., shade icon in topos) -->
          <ng-content select="[titleInfo]" />
        </div>

        <!-- Actions container -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <!-- Like button -->
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
                  : ((liked()
                      ? 'actions.favorite.remove'
                      : 'actions.favorite.add'
                    ) | translate)
              "
              (click.zoneless)="toggleLike.emit()"
            >
              {{
                (liked() ? 'actions.favorite.remove' : 'actions.favorite.add')
                  | translate
              }}
            </button>
          }
          <!-- Custom action buttons slot -->
          <ng-content select="[actionButtons]" />
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  protected readonly global = inject(GlobalData);

  title = input.required<string>();
  titleDropdown = input<TemplateRef<Record<string, unknown>> | null>(null);
  liked = input(false);
  showLike = input(true);

  toggleLike = output<void>();
}
