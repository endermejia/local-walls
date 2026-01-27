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
    <nav class="flex justify-center" tuiTabBar ngSkipHydration>
      <div class="w-full max-w-2xl flex justify-between">
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.home"
          routerLink="/home"
          ngSkipHydration
        >
          {{ 'nav.home' | translate }}
        </button>
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.map"
          routerLink="/explore"
          ngSkipHydration
        >
          {{ 'nav.explore' | translate }}
        </button>
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.list"
          routerLink="/areas"
          ngSkipHydration
        >
          {{ 'nav.areas' | translate }}
        </button>

        @if (global.isAdmin() || global.isEquipper()) {
          <button
            tuiIconButton
            appearance="action-grayscale"
            type="button"
            iconStart="@tui.cog"
            [tuiDropdown]="more"
            [(tuiDropdownOpen)]="moreOpen"
            (click)="moreOpen = true"
            ngSkipHydration
          >
            {{ 'labels.more' | translate }}
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

        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          routerLink="/profile"
          ngSkipHydration
        >
          <tui-avatar
            [src]="global.userAvatar() || '@tui.user'"
            [tuiSkeleton]="!global.userProfile()"
            size="s"
            type="button"
          />
        </button>
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
