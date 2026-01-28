import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TuiAppearance, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-navbar',
  host: {
    class:
      'z-[100] relative lg:absolute md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiIcon,
    TuiSkeleton,
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

        @if (global.isAdmin() || global.isEquipper()) {
          <a
            #config="routerLinkActive"
            [routerLink]="global.isAdmin() ? '/admin' : '/admin/my-areas'"
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
                {{ 'nav.my-crags' | translate }}
              }
            </span>
          </a>
        }

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
}
