import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiDataListComponent,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiButton,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiDataListDropdownManager,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TuiTabBar } from '@taiga-ui/addon-mobile';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-header',
  standalone: true,
  host: {
    class: 'z-[100] relative',
  },
  imports: [
    RouterLink,
    TuiAvatar,
    TuiDataListComponent,
    TranslatePipe,
    TuiDataList,
    TuiDataListDropdownManager,
    TuiDropdown,
    TuiIcon,
    TuiTabBar,
    TuiButton,
    TuiSkeleton,
  ],
  template: `
    <nav
      class="w-full md:w-20 md:hover:w-64 md:h-full bg-[var(--tui-background-base)] shadow-xs transition-[width] duration-300 z-[100] group flex flex-col border-t md:border-t-0 md:border-r border-[var(--tui-border-normal)]"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col w-full h-full p-2 md:p-4 justify-around md:justify-start gap-2 md:gap-4"
      >
        <a
          routerLink="/home"
          routerLinkActive="!text-primary"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.home" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.home' | translate }}
          </span>
        </a>

        <a
          routerLink="/explore"
          routerLinkActive="!text-primary"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.map" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.explore' | translate }}
          </span>
        </a>

        <a
          routerLink="/areas"
          routerLinkActive="!text-primary"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.list" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.areas' | translate }}
          </span>
        </a>

        @if (global.isAdmin() || global.isEquipper()) {
          <button
            appearance="flat"
            tuiButton
            type="button"
            class="!flex items-center gap-4 p-3 md:p-3 cursor-pointer hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full !border-0 !bg-transparent !text-inherit !h-auto !min-h-0"
            [tuiDropdown]="more"
            [(tuiDropdownOpen)]="moreOpen"
            (click)="moreOpen = true"
          >
            <tui-icon icon="@tui.cog" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'labels.more' | translate }}
            </span>

            <ng-template #more let-close>
              <tui-data-list tuiDataListDropdownManager>
                @if (global.isEquipper()) {
                  <button
                    tuiOption
                    type="button"
                    routerLink="/my-crags"
                    (click)="close()"
                  >
                    <tui-icon icon="@tui.list" class="mr-2" />
                    {{ 'nav.my-crags' | translate }}
                  </button>
                }
                @if (global.isAdmin()) {
                  <button
                    tuiOption
                    type="button"
                    routerLink="/admin/users"
                    (click)="close()"
                  >
                    <tui-icon icon="@tui.users" class="mr-2" />
                    {{ 'nav.admin-users' | translate }}
                  </button>
                  <button
                    tuiOption
                    type="button"
                    routerLink="/admin/parkings"
                    (click)="close()"
                  >
                    <tui-icon icon="@tui.map-pin" class="mr-2" />
                    {{ 'nav.admin-parkings' | translate }}
                  </button>
                }
                @if (global.isAdmin() || global.isEquipper()) {
                  <button
                    tuiOption
                    type="button"
                    routerLink="/admin/equippers"
                    (click)="close()"
                  >
                    <tui-icon icon="@tui.hammer" class="mr-2" />
                    {{ 'nav.admin-equippers' | translate }}
                  </button>
                }
              </tui-data-list>
            </ng-template>
          </button>
        }

        <a
          routerLink="/profile"
          routerLinkActive="!text-primary"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full md:mt-auto"
        >
          <tui-avatar
            [src]="global.userAvatar() || '@tui.user'"
            [tuiSkeleton]="!global.userProfile()"
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
export class HeaderComponent implements OnDestroy {
  protected global = inject(GlobalData);

  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly isBrowser =
    isPlatformBrowser(this.platformId) && typeof document !== 'undefined';
  private readonly onFsChange = () => {
    if (this.isBrowser) this.isFullscreen.set(!!document.fullscreenElement);
  };

  isFullscreen: WritableSignal<boolean> = signal(false);

  moreOpen = false;

  constructor() {
    if (this.isBrowser) {
      this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this.onFsChange);
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      document.removeEventListener('fullscreenchange', this.onFsChange);
    }
  }
}
