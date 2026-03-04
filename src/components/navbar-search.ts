import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  effect,
  ChangeDetectorRef,
  TemplateRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiIcon, TuiTextfield, TuiTitle, TuiDropdown } from '@taiga-ui/core';
import {
  TuiSearchHotkey,
  TuiSearchResults,
} from '@taiga-ui/experimental';
import { TuiAvatar, TuiPulse } from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs';

import { SearchService } from '../services/search.service';
import { TourService, TourStep } from '../services/tour.service';

@Component({
  selector: 'app-navbar-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiIcon,
    TuiInputSearch,
    TuiSearchHotkey,
    TuiSearchResults,
    TuiTextfield,
    TuiCell,
    TuiTitle,
    TuiAutoFocus,
    TuiDropdown,
    TuiPulse,
  ],
  template: `
    <div class="flex flex-col gap-2 overflow-hidden flex-none relative">
      <div
        class="absolute inset-0 pointer-events-none"
        [tuiDropdown]="tourHintTemplate()!"
        [tuiDropdownManual]="
          tourService.isActive() && tourService.step() === TourStep.SEARCH
        "
        tuiDropdownDirection="bottom"
      ></div>
      <button
        [tuiAppearance]="
          searchExpanded() ? 'flat-destructive' : 'flat-grayscale'
        "
        class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative"
        (click)="searchOpen = true"
        [attr.aria-label]="'search' | translate"
      >
        @if (
          tourService.isActive() && tourService.step() === TourStep.SEARCH
        ) {
          <tui-pulse />
        }
        <tui-icon icon="@tui.search" />
        <span
          class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
        >
          {{ 'search' | translate }}
        </span>
      </button>
      <div class="hidden">
        <tui-textfield>
          <input
            #searchInput
            tuiSearchHotkey
            autocomplete="off"
            tuiAutoFocus
            [formControl]="control"
            [tuiInputSearch]="search"
            [(tuiInputSearchOpen)]="searchOpen"
            [placeholder]="'searchPlaceholder' | translate"
          />
          <ng-template #search>
            <tui-search-results [results]="results()">
              <ng-template let-item>
                <a tuiCell [routerLink]="item.href" (click)="onResultClick()">
                  @if (item.type === 'user') {
                    <tui-avatar
                      [src]="item.icon || '@tui.user'"
                      size="xs"
                      class="mr-2"
                    />
                  } @else if (item.icon) {
                    <tui-icon [icon]="item.icon" class="mr-2" />
                  }
                  <span tuiTitle>
                    {{ item.title }}
                    @if (item.subtitle) {
                      <span tuiSubtitle>{{ item.subtitle }}</span>
                    }
                  </span>
                </a>
              </ng-template>
            </tui-search-results>
          </ng-template>
        </tui-textfield>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarSearchComponent {
  private readonly searchService = inject(SearchService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;

  readonly tourHintTemplate = input<TemplateRef<any> | null>(null);

  protected readonly searchExpanded = signal(false);
  protected readonly control = new FormControl('');
  protected searchOpen = false;

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    effect(() => {
      const step = this.tourService.step();
      if (step === TourStep.SEARCH) {
        // Wait a bit to let the dropdown initialize, then programmatically open and type "Millena"
        setTimeout(() => {
          this.searchOpen = true;
          this.searchExpanded.set(true);
          this.control.setValue('Millena');
          cdr.markForCheck();
        }, 500);
      }
    });
  }

  protected readonly results = toSignal(
    this.control.valueChanges.pipe(
      map((v) => (v ?? '').trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => this.searchService.search(query)),
      startWith(null),
    ),
    { initialValue: null },
  );

  protected onResultClick(): void {
    this.searchOpen = false;
    this.control.setValue('', { emitEvent: false });
  }

  public clearSearch(): void {
    this.searchOpen = false;
    this.searchExpanded.set(false);
    this.control.setValue('', { emitEvent: false });
  }
}
