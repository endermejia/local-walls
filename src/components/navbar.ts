import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiIcon, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { TuiAppearance, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import {
  TuiDialogService,
  TuiSearchHotkey,
  TuiSearchResults,
} from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiConfirmData,
  TuiSkeleton,
  TuiSwitch,
} from '@taiga-ui/kit';
import {
  TuiPulse,
  TuiSegmented,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  startWith,
  switchMap,
} from 'rxjs';

import { GlobalData } from '../services/global-data';
import { ScrollService } from '../services/scroll.service';
import { SearchService } from '../services/search.service';
import { SupabaseService } from '../services/supabase.service';
import { TourService } from '../services/tour.service';
import { TourStep } from '../services/tour.service';
import { UserProfilesService } from '../services/user-profiles.service';

import { Themes } from '../models';

import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../dialogs/notifications-dialog';
import { TourHintComponent } from './tour-hint';

@Component({
  selector: 'app-navbar',
  host: {
    class: 'z-[100] relative md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    FormsModule,
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
    TuiDropdown,
    TuiPulse,
    TourHintComponent,
    TuiDataList,
    TuiSegmented,
    TuiBadgedContent,
    TuiBadgeNotification,
    NgOptimizedImage,
    TuiSwitch,
  ],
  template: `
    <aside
      class="w-full md:w-20 md:hover:w-64 md:h-full bg-[var(--tui-background-base)] transition-[width] duration-300 z-[100] group flex flex-col border-t md:border xl:border-none border-[var(--tui-border-normal)] md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden sm:rounded-2xl"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col justify-between w-full h-full p-2 md:p-4 gap-2 md:gap-4"
      >
        <!-- Desktop Logo -->
        <button
          class="hidden md:block shrink-0 rounded-xl transition-colors cursor-pointer w-fit"
          type="button"
          tuiAppearance="flat-grayscale"
          routerLink="/home"
        >
          <img
            ngSrc="/logo/climbeast.svg"
            alt="ClimBeast"
            [style.width.px]="46"
            [style.height.px]="35"
            width="46"
            height="35"
          />
        </button>

        <!-- Navigation Links (Middle) -->
        <nav
          class="w-full flex md:flex-col gap-2 md:gap-4 justify-around md:justify-start overflow-y-auto overflow-x-hidden my-auto"
        >
          <!-- Home -->
          <a
            #home="routerLinkActive"
            routerLink="/home"
            routerLinkActive
            [tuiAppearance]="
              home.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative"
            (click)="scrollToTop($event)"
            [attr.aria-label]="'nav.home' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() && tourService.step() === TourStep.HOME
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.HOME
            ) {
              <tui-pulse />
            }
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
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative"
            [attr.aria-label]="'nav.explore' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                tourService.step() === TourStep.EXPLORE
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.EXPLORE
            ) {
              <tui-pulse />
            }
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
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative"
            [attr.aria-label]="'nav.areas' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() && tourService.step() === TourStep.AREAS
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.AREAS
            ) {
              <tui-pulse />
            }
            <tui-icon icon="@tui.list" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.areas' | translate }}
            </span>
          </a>

          @let showConfig =
            global.isAdmin() ||
            (global.isEquipper() && global.equipperAreas().length);
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
              [attr.aria-label]="
                (global.isAdmin() ? 'config' : 'nav.my-areas') | translate
              "
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
              [attr.aria-label]="'search' | translate"
            >
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

          <!-- Messages -->
          <button
            type="button"
            tuiAppearance="flat-grayscale"
            class="hidden md:flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative"
            (click)="openChat()"
            [attr.aria-label]="'messages' | translate"
          >
            @if (global.unreadMessagesCount(); as unreadMessages) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                class="absolute top-2 left-7 z-10"
              >
                {{ unreadMessages }}
              </tui-badge-notification>
            }
            <tui-icon icon="@tui.messages-square" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'messages' | translate }}
            </span>
          </button>

          <!-- Notifications -->
          @if (!global.userProfile()?.private) {
            <button
              type="button"
              tuiAppearance="flat-grayscale"
              class="hidden md:flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative"
              (click)="openNotifications()"
              [attr.aria-label]="'notifications' | translate"
            >
              @if (global.unreadNotificationsCount(); as unreadNotifications) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  class="absolute top-2 left-7 z-10"
                >
                  {{ unreadNotifications }}
                </tui-badge-notification>
              }
              <tui-icon icon="@tui.bell" />
              <span
                class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
              >
                {{ 'notifications' | translate }}
              </span>
            </button>
          }

          <!-- Profile -->
          <a
            #profile="routerLinkActive"
            routerLink="/profile"
            routerLinkActive
            [tuiAppearance]="
              profile.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full lg:mt-auto"
            [attr.aria-label]="'nav.profile' | translate"
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
        </nav>

        <!-- Desktop Bottom Options -->
        <div class="hidden md:block w-full shrink-0">
          <button
            type="button"
            [tuiAppearance]="'flat-grayscale'"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-full cursor-pointer"
            [tuiDropdown]="optionsDropdown"
            [(tuiDropdownOpen)]="configOpen"
            tuiDropdownDirection="top"
            [attr.aria-label]="'config' | translate"
          >
            <tui-icon icon="@tui.menu" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden text-sm"
            >
              {{ 'more' | translate }}
            </span>
          </button>
          <ng-template #optionsDropdown>
            <tui-data-list>
              <button tuiOption new (click)="openConfig(); configOpen = false">
                <tui-icon icon="@tui.settings" class="mr-2" />
                {{ 'config' | translate }}
              </button>
              <label
                class="flex items-center justify-between gap-4 p-2 w-full cursor-pointer hover:bg-[var(--tui-background-neutral-hover)] rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <tui-icon icon="@tui.edit-2" />
                  {{ 'editingMode' | translate }}
                </div>
                <input
                  tuiSwitch
                  type="checkbox"
                  [ngModel]="global.editingMode()"
                  (ngModelChange)="toggleEditingMode($event)"
                />
              </label>
              <div
                class="flex items-center justify-between gap-4 p-2 w-full hover:bg-[var(--tui-background-neutral-hover)] rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <tui-icon icon="@tui.palette" />
                  {{ 'theme' | translate }}
                </div>
                <tui-segmented
                  size="s"
                  [activeItemIndex]="global.theme() === Themes.DARK ? 1 : 0"
                  (activeItemIndexChange)="toggleTheme($event === 1)"
                >
                  <button title="light" type="button">
                    <tui-icon icon="@tui.sun" />
                  </button>
                  <button title="dark" type="button">
                    <tui-icon icon="@tui.moon" />
                  </button>
                </tui-segmented>
              </div>
              <button tuiOption new (click)="logout()">
                <tui-icon icon="@tui.log-out" class="mr-2" />
                {{ 'auth.logout' | translate }}
              </button>
            </tui-data-list>
          </ng-template>
        </div>
      </div>
    </aside>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="'tour.home.description' | translate"
        (next)="tourService.next()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected global = inject(GlobalData);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected readonly Themes = Themes;

  protected readonly searchExpanded = signal(false);
  protected readonly control = new FormControl('');
  protected searchOpen = false;
  protected configOpen = false;

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

  protected scrollToTop(event: MouseEvent): void {
    if (this.router.url === '/home') {
      event.preventDefault();
      this.scrollService.scrollToTop();
    }
  }

  protected openChat(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected openNotifications(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  protected async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  protected openConfig(): void {
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected toggleTheme(isDark: boolean): void {
    this.global.theme.set(isDark ? Themes.DARK : Themes.LIGHT);
  }

  protected async toggleEditingMode(enabled: boolean): Promise<void> {
    if (this.global.editingMode() === enabled) {
      return;
    }

    if (enabled && !this.global.isActualAdmin()) {
      const isEquipper = this.global.isActualEquipper();
      const messageKey = isEquipper
        ? 'profile.editing.confirmationEquipper'
        : 'profile.editing.confirmationUser';

      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('profile.editing.confirmationTitle'),
          size: 'm',
          data: {
            content: this.translate.instant(messageKey),
            yes: this.translate.instant('accept'),
            no: this.translate.instant('cancel'),
          } as TuiConfirmData,
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        // Force the switch to stay false
        this.global.editingMode.set(false);
        return;
      }
    }

    this.global.editingMode.set(enabled);
  }
}
