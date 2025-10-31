import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  WritableSignal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import {
  TuiAppearance,
  TuiButton,
  TuiNotification,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiHeader, TuiCardLarge, TuiForm } from '@taiga-ui/layout';
import { SupabaseService } from '../services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiNotification,
    TuiTextfield,
    TuiTitle,
    TuiHeader,
    TuiCardLarge,
    TuiForm,
  ],
  template: `
    <form
      tuiAppearance="floating"
      tuiCardLarge
      tuiForm="m"
      class="w-full max-w-sm mx-auto"
      novalidate
      (submit.zoneless)="submit($event)"
    >
      <header tuiHeader>
        <h2 tuiTitle>
          @if (!isRecovery()) {
            {{ 'auth.login' | translate }}
          } @else {
            {{ 'auth.setNewPassword' | translate }}
          }
          <span tuiSubtitle>{{ 'common.appName' | translate }}</span>
        </h2>
      </header>

      @let err = error();
      @if (err) {
        <tui-notification appearance="warning">
          <h3 tuiTitle>
            {{ err | translate }}
          </h3>
        </tui-notification>
      }

      @if (!isRecovery()) {
        <!-- Continue with Google button -->
        <button
          tuiButton
          appearance="outline"
          type="button"
          class="w-full"
          (click.zoneless)="loginWithGoogle()"
        >
          {{ 'actions.continueWithGoogle' | translate }}
        </button>

        <!-- Separator -->
        <div class="flex items-center gap-3 my-3" aria-hidden="true">
          <div class="grow h-px bg-[var(--tui-base-04)]"></div>
          <span class="text-[var(--tui-text-03)]">{{
            'auth.or' | translate
          }}</span>
          <div class="grow h-px bg-[var(--tui-base-04)]"></div>
        </div>

        <tui-textfield>
          <label tuiLabel for="emailInput">{{
            'labels.email' | translate
          }}</label>
          <input
            id="emailInput"
            tuiTextfield
            type="email"
            placeholder="{{ 'labels.email' | translate }}"
            [value]="email()"
            (input.zoneless)="onInputEmail($any($event.target).value)"
            [attr.aria-invalid]="validate() && !email() ? 'true' : null"
            autocomplete="email"
          />
        </tui-textfield>

        <tui-textfield>
          <label tuiLabel for="passwordInput">{{
            'labels.password' | translate
          }}</label>
          <input
            id="passwordInput"
            tuiTextfield
            type="password"
            placeholder="{{ 'labels.password' | translate }}"
            [value]="password()"
            (input.zoneless)="onInputPassword($any($event.target).value)"
            [attr.aria-invalid]="validate() && !password() ? 'true' : null"
            autocomplete="current-password"
          />
        </tui-textfield>

        <div class="flex justify-end mb-2">
          <button
            type="button"
            tuiButton
            appearance="flat"
            (click.zoneless)="forgotPassword()"
          >
            {{ 'auth.forgotPassword' | translate }}
          </button>
        </div>

        <footer class="flex flex-col gap-2">
          <button tuiButton type="submit" class="w-full">
            {{ 'actions.signIn' | translate }}
          </button>
          <div class="text-center text-[var(--tui-text-02)]">
            {{ 'auth.noAccount' | translate }}
            <button
              type="button"
              tuiButton
              appearance="flat"
              (click.zoneless)="register()"
            >
              {{ 'actions.register' | translate }}
            </button>
          </div>
        </footer>
      } @else {
        <!-- Password recovery form -->
        <tui-textfield>
          <label tuiLabel for="newPasswordInput">{{
            'labels.newPassword' | translate
          }}</label>
          <input
            id="newPasswordInput"
            tuiTextfield
            type="password"
            placeholder="{{ 'labels.newPassword' | translate }}"
            [value]="newPassword()"
            (input.zoneless)="newPassword.set($any($event.target).value)"
            [attr.aria-invalid]="validate() && !newPassword() ? 'true' : null"
            autocomplete="new-password"
          />
        </tui-textfield>

        <tui-textfield>
          <label tuiLabel for="confirmPasswordInput">{{
            'labels.confirmPassword' | translate
          }}</label>
          <input
            id="confirmPasswordInput"
            tuiTextfield
            type="password"
            placeholder="{{ 'labels.confirmPassword' | translate }}"
            [value]="confirmPassword()"
            (input.zoneless)="confirmPassword.set($any($event.target).value)"
            [attr.aria-invalid]="
              validate() && confirmPassword() !== newPassword() ? 'true' : null
            "
            autocomplete="new-password"
          />
        </tui-textfield>

        <footer class="flex flex-col gap-2">
          <button
            tuiButton
            type="button"
            class="w-full"
            (click.zoneless)="submitNewPassword()"
          >
            {{ 'auth.setNewPassword' | translate }}
          </button>
        </footer>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow items-center justify-center p-6' },
})
export class LoginComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  email: WritableSignal<string> = signal('');
  password: WritableSignal<string> = signal('');
  error: WritableSignal<string | null> = signal<string | null>(null);
  loading: WritableSignal<boolean> = signal(false);
  validate: WritableSignal<boolean> = signal(false);

  // Password recovery state
  readonly isRecovery = computed(() => {
    if (this.supabase.lastAuthEvent() === 'PASSWORD_RECOVERY') return true;
    // Fallback: check URL hash/query for type=recovery (browser only)
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });
  newPassword: WritableSignal<string> = signal('');
  confirmPassword: WritableSignal<string> = signal('');

  onInputEmail(value: string) {
    this.email.set(value);
  }

  onInputPassword(value: string) {
    this.password.set(value);
  }

  async submit(evt?: Event) {
    evt?.preventDefault?.();
    this.error.set(null);
    this.validate.set(true);
    if (!this.email()?.trim() || !this.password()?.trim()) {
      return; // Do not proceed; show validation state without native browser errors
    }
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.login(
        this.email(),
        this.password(),
      );
      if (error) {
        // Do not surface provider raw messages; show translated key
        this.error.set('errors.invalidCredentials');
        return;
      }
      // If email confirmation is required, Supabase may not return session immediately
      if (!data?.session) {
        this.error.set('auth.verifyEmail');
        return;
      }
      this.error.set(null);
      void this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  async register() {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.register(
        this.email(),
        this.password(),
      );
      if (error) {
        this.error.set('auth.registrationError');
        return;
      }
      // In most projects, sign up requires email confirmation
      this.error.set('auth.registrationSuccess');
    } catch (e: any) {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { error } = await this.supabase.loginWithProvider('google');
      if (error) {
        this.error.set('errors.unexpected');
      }
    } catch (e: any) {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  async forgotPassword() {
    this.error.set(null);
    const email = this.email()?.trim();
    if (!email) {
      this.error.set('auth.provideEmail');
      return;
    }
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      let redirectTo: string | undefined = undefined;
      if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
        redirectTo = window.location.origin + '/';
      }
      const { error } = await this.supabase.resetPassword(email, redirectTo);
      if (error) {
        this.error.set('errors.unexpected');
        return;
      }
      this.error.set('auth.resetEmailSent');
    } catch (e: any) {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  async submitNewPassword() {
    this.error.set(null);
    this.validate.set(true);
    const npw = this.newPassword()?.trim();
    const cpw = this.confirmPassword()?.trim();
    if (!npw || !cpw) {
      return;
    }
    if (npw !== cpw) {
      this.error.set('errors.passwordMismatch');
      return;
    }
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { error } = await this.supabase.updatePassword(npw);
      if (error) {
        this.error.set('errors.unexpected');
        return;
      }
      this.error.set('auth.passwordUpdated');
      this.newPassword.set('');
      this.confirmPassword.set('');
      void this.router.navigateByUrl('/home');
    } catch (e: any) {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }
}
