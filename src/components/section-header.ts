import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiItem } from '@taiga-ui/cdk';
import { TuiButton, TuiDropdown, TuiLink } from '@taiga-ui/core';
import { TuiBreadcrumbs, TuiChevron } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services/global-data';

@Component({
  selector: 'app-section-header',
  imports: [
    RouterLink,
    TranslatePipe,
    TuiBreadcrumbs,
    TuiButton,
    TuiChevron,
    TuiDropdown,
    TuiItem,
    TuiLink,
  ],
  template: `
    <header class="flex flex-col w-full">
      @let breadcrumbs = global.slicedBreadcrumbs();
      @let isMobile = global.isMobile();

      <div class="flex items-start justify-between gap-3">
        <!-- Breadcrumb -->
        @if (breadcrumbs.length) {
          <tui-breadcrumbs
            size="l"
            [itemsLimit]="isMobile && breadcrumbs.length > 1 ? 2 : 1"
            ngSkipHydration
          >
            @for (item of breadcrumbs; track item.routerLink) {
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
              (click.zoneless)="toggleLike.emit()"
            >
              {{ (liked() ? 'favorite.remove' : 'favorite.add') | translate }}
            </button>
          }
          <!-- Custom action buttons slot -->
          <ng-content select="[actionButtons]" />
        </div>
      </div>
      <!-- Title / Dropdown -->
      <h1
        class="text-2xl font-bold flex gap-2 items-center w-full"
        [class.line-clamp-1]="!titleDropdown()"
      >
        @if (titleDropdown(); as template) {
          <button
            tuiLink
            tuiChevron
            appearance="flat"
            type="button"
            class="!text-2xl !font-bold !text-inherit !no-underline !bg-transparent"
            [tuiDropdown]="template"
            [(tuiDropdownOpen)]="dropdownOpen"
          >
            {{ title() }}
          </button>
        } @else {
          {{ title() }}
        }
        <!-- Additional title info (e.g., shade icon in topos) -->
        <ng-content select="[titleInfo]" />
      </h1>
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

  dropdownOpen = signal(false);

  toggleLike = output<void>();
}
