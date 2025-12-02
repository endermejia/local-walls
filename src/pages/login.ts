import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  WritableSignal,
  computed,
  PLATFORM_ID,
  afterNextRender,
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
            @if (!isRegister()) {
              {{ 'auth.login' | translate }}
            } @else {
              {{ 'auth.register' | translate }}
            }
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
            [attr.aria-invalid]="validate() && !emailValid() ? 'true' : null"
            autocomplete="email"
          />
        </tui-textfield>

        @if (validate() && !emailValid()) {
          <tui-notification appearance="warning">
            <h3 tuiTitle>{{ 'auth.enterValidEmail' | translate }}</h3>
          </tui-notification>
        }

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
            [attr.aria-invalid]="validate() && !passwordValid() ? 'true' : null"
            autocomplete="current-password"
          />
        </tui-textfield>

        @if (validate() && !passwordValid()) {
          <tui-notification appearance="warning">
            <h3 tuiTitle>
              {{ 'auth.passwordMinLength' | translate: { min: 6 } }}
            </h3>
          </tui-notification>
        }

        @if (isRegister()) {
          <tui-textfield>
            <label tuiLabel for="confirmRegPasswordInput">{{
              'labels.confirmPassword' | translate
            }}</label>
            <input
              id="confirmRegPasswordInput"
              tuiTextfield
              type="password"
              placeholder="{{ 'labels.confirmPassword' | translate }}"
              [value]="confirmPassword()"
              (input.zoneless)="confirmPassword.set($any($event.target).value)"
              [attr.aria-invalid]="
                validate() && confirmPassword() !== password() ? 'true' : null
              "
              autocomplete="new-password"
            />
          </tui-textfield>

          @if (validate() && confirmPassword() !== password()) {
            <tui-notification appearance="warning">
              <h3 tuiTitle>{{ 'errors.passwordMismatch' | translate }}</h3>
            </tui-notification>
          }
        }

        @if (!isRegister()) {
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
        }

        <footer class="flex flex-col gap-2">
          @if (!isRegister()) {
            <button
              tuiButton
              type="submit"
              class="w-full"
              [disabled]="!canSignIn() || loading()"
            >
              {{ 'actions.signIn' | translate }}
            </button>
            <div class="text-center text-[var(--tui-text-02)]">
              {{ 'auth.noAccount' | translate }}
              <button
                type="button"
                tuiButton
                appearance="flat"
                (click.zoneless)="toggleRegister()"
              >
                {{ 'actions.register' | translate }}
              </button>
            </div>
          } @else {
            <button
              tuiButton
              type="button"
              class="w-full"
              [disabled]="!canRegister() || loading()"
              (click.zoneless)="submitRegister()"
            >
              {{ 'actions.register' | translate }}
            </button>
            <div class="text-center text-[var(--tui-text-02)]">
              {{ 'auth.alreadyAccount' | translate }}
              <button
                type="button"
                tuiButton
                appearance="flat"
                (click.zoneless)="toggleRegister(false)"
              >
                {{ 'actions.signIn' | translate }}
              </button>
            </div>
          }
        </footer>
      } @else {
        <!-- Password recovery form -->
        <tui-notification appearance="neutral">
          <h3 tuiTitle>{{ 'auth.inRecoveryInfo' | translate }}</h3>
        </tui-notification>
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
            [attr.aria-invalid]="
              validate() && !newPasswordValid() ? 'true' : null
            "
            autocomplete="new-password"
          />
        </tui-textfield>

        @if (validate() && !newPasswordValid()) {
          <tui-notification appearance="warning">
            <h3 tuiTitle>
              {{ 'auth.passwordMinLength' | translate: { min: 6 } }}
            </h3>
          </tui-notification>
        }

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

        @if (validate() && confirmPassword() !== newPassword()) {
          <tui-notification appearance="warning">
            <h3 tuiTitle>{{ 'errors.passwordMismatch' | translate }}</h3>
          </tui-notification>
        }

        <footer class="flex flex-col gap-2">
          <button
            tuiButton
            type="button"
            class="w-full"
            (click.zoneless)="submitNewPassword()"
            [disabled]="!canChangePassword() || loading()"
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
  isRegister: WritableSignal<boolean> = signal(false);

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

  // Validators
  readonly emailValid = computed(() => /.+@.+\..+/.test(this.email().trim()));
  readonly passwordValid = computed(() => this.password().length >= 6);
  readonly newPasswordValid = computed(() => this.newPassword().length >= 6);
  readonly canSignIn = computed(
    () => this.emailValid() && this.passwordValid(),
  );
  readonly canRegister = computed(
    () =>
      this.emailValid() &&
      this.passwordValid() &&
      this.confirmPassword() === this.password(),
  );
  readonly canChangePassword = computed(
    () =>
      this.newPasswordValid() && this.confirmPassword() === this.newPassword(),
  );

  constructor() {
    // Asegurar que, al entrar desde el enlace de recuperación, el token se intercambie y haya sesión activa
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      afterNextRender(() => {
        if (this.isRecovery()) {
          void this.supabase.whenReady().then(() => this.supabase.getSession());
        }
      });
    }
  }

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
    if (this.isRegister()) {
      return this.submitRegister();
    }
    if (!this.canSignIn()) {
      return; // Do not proceed; show the validation state without native browser errors
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
      void this.router.navigateByUrl('/explore');
    } catch {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  toggleRegister(force?: boolean) {
    const next = typeof force === 'boolean' ? force : !this.isRegister();
    this.isRegister.set(next);
    this.validate.set(false);
    this.confirmPassword.set('');
  }

  async submitRegister() {
    this.error.set(null);
    this.validate.set(true);
    if (!this.canRegister()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { error } = await this.supabase.register(
        this.email(),
        this.password(),
      );
      if (error) {
        this.error.set('auth.registrationError');
        return;
      }
      // In most projects, signup requires email confirmation
      this.error.set('auth.registrationSuccess');
      // Volvemos a la vista de login
      this.isRegister.set(false);
    } catch {
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
        // Importante: redirigimos al login con flag de recuperación para evitar caer en '/explore'
        // por el redirect de la raíz tanto en SSR como en el router del cliente.
        // Supabase añadirá su hash con tokens y 'type=recovery', que este componente detecta.
        redirectTo = `${window.location.origin}/login?type=recovery`;
      }
      const { error } = await this.supabase.resetPassword(email, redirectTo);
      if (error) {
        this.error.set('errors.unexpected');
        return;
      }
      this.error.set('auth.resetEmailSent');
    } catch {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }

  async submitNewPassword() {
    this.error.set(null);
    this.validate.set(true);
    const npw = this.newPassword();
    const cpw = this.confirmPassword();
    if (!npw || !cpw) {
      return;
    }
    if (npw !== cpw) {
      this.error.set('errors.passwordMismatch');
      return;
    }
    if (npw.length < 6) {
      this.error.set('auth.passwordMinLength');
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
      void this.router.navigateByUrl('/explore');
    } catch {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }
}
