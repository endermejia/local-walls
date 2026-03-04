import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiIcon, TuiDataList, TuiDropdown, TuiAppearance } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData, TuiSegmented, TuiSwitch } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../services/global-data';
import { SupabaseService } from '../services/supabase.service';
import { UserProfilesService } from '../services/user-profiles.service';
import { ToastService } from '../services/toast.service';

import { Themes } from '../models';

@Component({
  selector: 'app-navbar-menu',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    TuiIcon,
    TuiDataList,
    TuiDropdown,
    TuiAppearance,
    TuiSegmented,
    TuiSwitch,
  ],
  template: `
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
              autocomplete="off"
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarMenuComponent {
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected readonly Themes = Themes;
  protected configOpen = false;

  protected async logout(): Promise<void> {
    await this.supabase.logout();
  }

  protected openConfig(): void {
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected toggleTheme(isDark: boolean): void {
    const newTheme = isDark ? Themes.DARK : Themes.LIGHT;
    this.global.theme.set(newTheme);
    this.userProfilesService
      .updateUserProfile({ theme: newTheme })
      .then((res) => {
        if (res.success) {
          this.toast.success('profile.saveSuccess');
        }
      });
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
