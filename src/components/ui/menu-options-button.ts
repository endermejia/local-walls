import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiConfirmData,
  TuiSegmented,
  TuiSkeleton,
  TuiSwitch,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { Themes } from '../../models';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

@Component({
  selector: 'app-menu-options-button',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiSegmented,
    TuiSkeleton,
    TuiSwitch,
  ],
  template: `
    @if (iconOnly()) {
      <button
        [appearance]="appearance()"
        [size]="size()"
        tuiIconButton
        [iconStart]="icon()"
        [tuiSkeleton]="loading()"
        [tuiDropdown]="optionsDropdown"
        [(tuiDropdownOpen)]="open"
        [tuiDropdownDirection]="direction()"
        type="button"
        class="transition-colors"
      >
        <span class="tui-sr-only">{{ 'more' | translate }}</span>
      </button>
    } @else {
      <button
        type="button"
        [tuiAppearance]="appearance()"
        class="flex items-center gap-4 transition-colors p-3 rounded-xl w-full cursor-pointer no-underline text-inherit"
        [tuiSkeleton]="loading()"
        [tuiDropdown]="optionsDropdown"
        [(tuiDropdownOpen)]="open"
        [tuiDropdownDirection]="direction()"
      >
        <tui-icon [icon]="icon()" />
        <span
          class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden text-sm"
        >
          {{ 'more' | translate }}
        </span>
      </button>
    }

    <ng-template #optionsDropdown>
      <tui-data-list>
        <button tuiOption new (click)="openConfig(); open = false">
          <tui-icon icon="@tui.settings" class="mr-2" />
          {{ 'config' | translate }}
        </button>
        <label
          class="flex items-center justify-between gap-4 p-2 w-full cursor-pointer hover:bg-[var(--tui-background-neutral-hover)] rounded-lg"
        >
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.pencil" />
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOptionsButtonComponent {
  appearance = input<string>('flat-grayscale');
  size = input<'s' | 'm' | 'l'>('m');
  iconOnly = input<boolean>(false);
  loading = input<boolean>(false);
  direction = input<'top' | 'bottom'>('top');
  icon = input<string>('@tui.menu');

  protected open = false;
  protected readonly global = inject(GlobalData);
  protected readonly Themes = Themes;
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  protected openConfig(): void {
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected async logout(): Promise<void> {
    await this.supabase.logout();
  }

  protected async toggleEditingMode(enabled: boolean): Promise<boolean> {
    if (this.global.editingMode() === enabled) {
      return true;
    }

    if (enabled && !this.global.isAdmin()) {
      const hasPermissions = this.global.isAreaAdmin();
      const messageKey = hasPermissions
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
        return false;
      }
    }

    this.global.editingMode.set(enabled);
    const result = await this.userProfilesService.updateUserProfile({
      editing_mode: enabled,
    });

    if (!result.success) {
      console.error(
        '[MenuOptionsButtonComponent] Error updating editing mode:',
        result.error,
      );
      this.toast.error('profile.saveError');
      // Revert the signal if failed
      this.global.editingMode.set(!enabled);
      return false;
    } else {
      this.toast.success('profile.saveSuccess');
      return true;
    }
  }

  protected toggleTheme(dark: boolean): void {
    const theme = dark ? Themes.DARK : Themes.LIGHT;
    this.global.theme.set(theme);
    void this.userProfilesService
      .updateUserProfile({
        theme,
      })
      .then((res) => {
        if (res.success) {
          this.toast.success('profile.saveSuccess');
        } else {
          console.error(
            '[MenuOptionsButtonComponent] Error updating theme:',
            res.error,
          );
          this.toast.error('profile.saveError');
        }
      });
  }
}
