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
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-header',
  standalone: true,
  host: {
    class: 'z-[100] relative md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    RouterLink,
    TuiAvatar,
    TranslatePipe,
    TuiIcon,
    TuiSkeleton,
    RouterLinkActive,
  ],
  template: `
    <nav
      class="w-full md:w-20 md:hover:w-64 md:h-fit md:max-h-[60rem] md:my-auto bg-[var(--tui-background-base)] transition-[width] duration-300 z-[100] group flex flex-col border-t md:border-t-0 border-[var(--tui-border-normal)] md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden rounded-2xl"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col w-full h-full p-2 md:p-4 justify-around md:justify-start gap-2 md:gap-4"
      >
        <a
          #home="routerLinkActive"
          routerLink="/home"
          routerLinkActive="!text-primary bg-[var(--tui-background-neutral-1)]"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.home" [class.active-icon]="home.isActive" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.home' | translate }}
          </span>
        </a>

        <a
          #explore="routerLinkActive"
          routerLink="/explore"
          routerLinkActive="!text-primary bg-[var(--tui-background-neutral-1)]"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.map" [class.active-icon]="explore.isActive" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.explore' | translate }}
          </span>
        </a>

        <a
          #areas="routerLinkActive"
          routerLink="/areas"
          routerLinkActive="!text-primary bg-[var(--tui-background-neutral-1)]"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
        >
          <tui-icon icon="@tui.list" [class.active-icon]="areas.isActive" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
          >
            {{ 'nav.areas' | translate }}
          </span>
        </a>

        @if (global.isAdmin() || global.isEquipper()) {
          <a
            #config="routerLinkActive"
            [routerLink]="global.isAdmin() ? '/admin' : '/my-areas'"
            routerLinkActive="!text-primary bg-[var(--tui-background-neutral-1)]"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full"
          >
            <tui-icon icon="@tui.cog" [class.active-icon]="config.isActive" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              @if (global.isAdmin()) {
                {{ 'config' | translate }}
              } @else {
                {{ 'nav.my-crags' | translate }}
              }
            </span>
          </a>
        }

        <a
          #profile="routerLinkActive"
          routerLink="/profile"
          routerLinkActive="!text-primary bg-[var(--tui-background-neutral-1)]"
          class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)] rounded-xl transition-colors w-fit md:w-full md:mt-auto"
        >
          <tui-avatar
            [src]="global.userAvatar() || '@tui.user'"
            [tuiSkeleton]="!global.userProfile()"
            [class.ring-2]="profile.isActive"
            [class.ring-primary]="profile.isActive"
            [class.ring-offset-2]="profile.isActive"
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
  styles: `
    .active-icon {
      filter: drop-shadow(0.5px 0 0 currentColor)
        drop-shadow(-0.5px 0 0 currentColor);
    }
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
