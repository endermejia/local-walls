import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TuiAppearance, TuiIcon, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { TuiSearchHotkey, TuiSearchResults } from '@taiga-ui/experimental';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { GlobalData, SearchService } from '../services';
import { SearchData } from '../models';
import { TuiAutoFocus } from '@taiga-ui/cdk';

@Component({
  selector: 'app-navbar',
  host: {
    class:
      'z-[100] relative xl:absolute md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiIcon,
    TuiInputSearch,
    TuiSearchHotkey,
    TuiSearchResults,
    TuiSkeleton,
    TuiTextfield,
    TuiCell,
    TuiTitle,
    TuiAutoFocus,
  ],
  template: `
    <nav
      class="w-full md:w-20 md:hover:w-64 md:h-fit md:my-auto bg-[var(--tui-background-base)] transition-[width] duration-300 z-[100] group flex flex-col border-t md:border xl:border-none border-[var(--tui-border-normal)] md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden sm:rounded-2xl"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col w-full h-full p-2 md:p-4 justify-around md:justify-start gap-2 md:gap-4"
      >
        <!-- Home -->
        <a
          #home="routerLinkActive"
          routerLink="/home"
          routerLinkActive
          [tuiAppearance]="
            home.isActive ? 'flat-destructive' : 'flat-grayscale'
          "
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.home" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.home' | translate }}
          </span>
        </a>

        <!-- Explore -->
        <a
          #explore="routerLinkActive"
          routerLink="/explore"
          routerLinkActive
          [tuiAppearance]="
            explore.isActive ? 'flat-destructive' : 'flat-grayscale'
          "
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.map" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.explore' | translate }}
          </span>
        </a>

        <!-- Areas -->
        <a
          #areas="routerLinkActive"
          routerLink="/area"
          routerLinkActive
          [tuiAppearance]="
            areas.isActive ? 'flat-destructive' : 'flat-grayscale'
          "
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.list" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.areas' | translate }}
          </span>
        </a>

        @let showConfig = global.isAdmin() || global.equipperAreas().length;
        @if (showConfig) {
          <!-- Configuration -->
          <a
            #config="routerLinkActive"
            [routerLink]="global.isAdmin() ? '/admin' : '/my-areas'"
            routerLinkActive
            [tuiAppearance]="
              config.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full"
          >
            <tui-icon icon="@tui.cog" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              @if (global.isAdmin()) {
                {{ 'config' | translate }}
              } @else {
                {{ 'nav.my-areas' | translate }}
              }
            </span>
          </a>
        }

        <!-- Search -->

        <div class="flex flex-col gap-2 overflow-hidden flex-none">
          <button
            [tuiAppearance]="
              searchExpanded() ? 'flat-destructive' : 'flat-grayscale'
            "
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer"
            (click)="searchOpen = true"
          >
            <tui-icon icon="@tui.search" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'labels.search' | translate }}
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
                [placeholder]="'labels.searchPlaceholder' | translate"
              />
              <ng-template #search>
                <tui-search-results [results]="results$ | async">
                  <ng-template let-item>
                    <a
                      tuiCell
                      [routerLink]="item.href"
                      (click)="onResultClick()"
                    >
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

        <!-- Profile -->
        <a
          #profile="routerLinkActive"
          routerLink="/profile"
          routerLinkActive
          [tuiAppearance]="
            profile.isActive ? 'flat-destructive' : 'flat-grayscale'
          "
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full md:mt-auto"
        >
          <tui-avatar
            [src]="global.userAvatar() || '@tui.user'"
            [tuiSkeleton]="!global.userProfile()"
            [class.ring-2]="profile.isActive"
            [class.ring-offset-2]="profile.isActive"
            [style.--tw-ring-color]="
              profile.isActive ? 'var(--tui-text-negative)' : ''
            "
            size="xs"
          />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.profile' | translate }}
          </span>
        </a>
      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected global = inject(GlobalData);
  private readonly searchService = inject(SearchService);

  protected readonly searchExpanded = signal(false);
  protected readonly control = new FormControl('');
  protected searchOpen = false;

  protected readonly results$: Observable<SearchData | null> =
    this.control.valueChanges.pipe(
      map((v) => (v ?? '').trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => this.searchService.search(query)),
      startWith(null),
      shareReplay(1),
    );

  protected onResultClick(): void {
    this.searchOpen = false;
    this.control.setValue('', { emitEvent: false });
  }
}
