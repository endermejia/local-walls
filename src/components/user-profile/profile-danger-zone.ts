import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiNotification,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { Observer } from 'rxjs';

@Component({
  selector: 'app-profile-danger-zone',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiError,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiNotification,
    TuiPassword,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <div
      class="flex flex-col gap-4 p-5 rounded-2xl bg-(--tui-base-02) border border-(--tui-border-normal)"
    >
      <h3
        class="text-base font-semibold flex items-center gap-2 m-0 text-(--tui-text-secondary)"
      >
        <tui-icon icon="@tui.shield" size="s" />
        {{ 'securityAndSession' | translate }}
      </h3>

      <div class="flex flex-col gap-3">
        <button
          tuiButton
          iconStart="@tui.lock"
          appearance="outline"
          type="button"
          size="m"
          class="w-full justify-start group"
          (click)="openChangePassword.emit(changePasswordDialog)"
        >
          {{ 'auth.setNewPassword' | translate }}
        </button>

        <button
          tuiButton
          iconStart="@tui.log-out"
          appearance="secondary"
          type="button"
          size="m"
          class="w-full justify-start group"
          (click)="logout.emit()"
        >
          {{ 'auth.logout' | translate }}
        </button>

        <button
          tuiButton
          iconStart="@tui.trash"
          appearance="negative"
          type="button"
          size="m"
          class="w-full justify-start group"
          (click)="openDeleteAccount.emit(deleteDialog)"
        >
          {{ 'profile.deleteAccount.button' | translate }}
        </button>
      </div>
    </div>

    <!-- Change Password Dialog Template -->
    <ng-template #changePasswordDialog let-observer>
      <div class="flex flex-col gap-4">
        <h3 tuiTitle>{{ 'auth.setNewPassword' | translate }}</h3>

        <tui-textfield class="block">
          <label tuiLabel for="newPasswordInput">{{
            'newPassword' | translate
          }}</label>
          <input
            id="newPasswordInput"
            tuiInput
            type="password"
            [ngModel]="passwordModel().newPassword"
            (ngModelChange)="onPasswordModelChange('newPassword', $event)"
            autocomplete="new-password"
          />
          <tui-icon tuiPassword />
        </tui-textfield>

        <tui-textfield class="block">
          <label tuiLabel for="confirmPasswordInput">{{
            'confirmPassword' | translate
          }}</label>
          <input
            id="confirmPasswordInput"
            tuiInput
            type="password"
            [ngModel]="passwordModel().confirmPassword"
            (ngModelChange)="onPasswordModelChange('confirmPassword', $event)"
            autocomplete="new-password"
          />
          <tui-icon tuiPassword />
        </tui-textfield>

        @if (passwordError(); as errorMsg) {
          <div tuiNotification appearance="negative">
            {{ errorMsg }}
          </div>
        }

        <div class="flex justify-end gap-2">
          <button
            tuiButton
            appearance="flat"
            type="button"
            (click)="observer.complete()"
          >
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary"
            type="button"
            [disabled]="
              isUpdatingPassword() ||
              !passwordModel().newPassword ||
              !passwordModel().confirmPassword ||
              !!passwordError()
            "
            (click)="confirmChangePassword.emit(observer)"
          >
            {{ 'accept' | translate }}
          </button>
        </div>
      </div>
    </ng-template>

    <!-- Delete Account Dialog Template -->
    <ng-template #deleteDialog let-observer>
      <div class="flex flex-col gap-4">
        <h3 tuiTitle>{{ 'profile.deleteAccount.title' | translate }}</h3>
        <p class="text-(--tui-text-negative) font-bold">
          {{ 'profile.deleteAccount.warning' | translate }}
        </p>
        <p>
          {{ 'profile.deleteAccount.instruction_prefix' | translate }}
          <strong>{{ userEmail() }}</strong>
          {{ 'profile.deleteAccount.instruction_suffix' | translate }}
        </p>

        <tui-textfield class="block">
          <label tuiLabel for="deleteEmailInput">{{
            'email' | translate
          }}</label>
          <input
            id="deleteEmailInput"
            tuiInput
            type="email"
            [ngModel]="deleteEmail()"
            (ngModelChange)="updateDeleteEmail.emit($event)"
            (paste)="$event.preventDefault()"
            [invalid]="deleteEmailInvalid()"
            autocomplete="off"
            placeholder="email@example.com"
          />
        </tui-textfield>
        @if (deleteEmailError(); as err) {
          <tui-error [error]="err" />
        }

        <div class="flex justify-end gap-2">
          <button tuiButton appearance="flat" (click)="observer.complete()">
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary-destructive"
            [disabled]="deleteEmail() !== userEmail()"
            (click)="confirmDeleteAccount.emit(observer)"
          >
            {{ 'profile.deleteAccount.button' | translate }}
          </button>
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDangerZoneComponent {
  readonly userEmail = input<string>('');
  readonly passwordModel = input.required<{
    newPassword: string;
    confirmPassword: string;
  }>();
  readonly passwordError = input<string | null>(null);
  readonly isUpdatingPassword = input<boolean>(false);
  readonly deleteEmail = input<string>('');
  readonly deleteEmailError = input<string | null>(null);
  readonly deleteEmailInvalid = input<boolean>(false);

  readonly updatePasswordModel = output<{ field: string; value: string }>();
  readonly updateDeleteEmail = output<string>();
  readonly openChangePassword = output<TemplateRef<unknown>>();
  readonly confirmChangePassword = output<Observer<void>>();
  readonly logout = output<void>();
  readonly openDeleteAccount = output<TemplateRef<unknown>>();
  readonly confirmDeleteAccount = output<Observer<void>>();

  protected onPasswordModelChange(field: string, value: string): void {
    this.updatePasswordModel.emit({ field, value });
  }
}
