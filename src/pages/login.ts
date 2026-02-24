import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiNotification,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { TuiCardLarge, TuiForm, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../services';

@Component({
  selector: 'app-login',
  imports: [
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiNotification,
    TuiTextfield,
    TuiTitle,
    TuiHeader,
    TuiCardLarge,
    TuiForm,
    NgOptimizedImage,
    TuiPassword,
  ],
  template: `
    <div class="relative h-full flex justify-center items-center">
      <div class="relative z-10 w-full md:w-3/5 flex justify-center p-6">
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
              <span tuiSubtitle>{{ 'appName' | translate }}</span>
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
              <label tuiLabel for="emailInput">{{ 'email' | translate }}</label>
              <input
                id="emailInput"
                #emailInput
                tuiTextfield
                type="email"
                [value]="email()"
                (input.zoneless)="onInputEmail(emailInput.value)"
                [attr.aria-invalid]="
                  validate() && !emailValid() ? 'true' : null
                "
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
                'password' | translate
              }}</label>
              <input
                id="passwordInput"
                #passwordInput
                tuiTextfield
                type="password"
                [value]="password()"
                (input.zoneless)="onInputPassword(passwordInput.value)"
                [attr.aria-invalid]="
                  validate() &&
                  (isRegister() ? !passwordValid() : password().length === 0)
                    ? 'true'
                    : null
                "
                autocomplete="current-password"
              />
              <tui-icon tuiPassword />
            </tui-textfield>

            @if (validate() && isRegister() && !passwordValid()) {
              <tui-notification appearance="warning">
                <h3 tuiTitle>
                  {{ 'auth.passwordRequirements' | translate: { min: 6 } }}
                </h3>
              </tui-notification>
            } @else if (
              validate() && !isRegister() && password().length === 0
            ) {
              <tui-notification appearance="warning">
                <h3 tuiTitle>{{ 'errors.required' | translate }}</h3>
              </tui-notification>
            }

            @if (isRegister()) {
              <tui-textfield>
                <label tuiLabel for="confirmRegPasswordInput">{{
                  'confirmPassword' | translate
                }}</label>
                <input
                  id="confirmRegPasswordInput"
                  #confirmRegPasswordInput
                  tuiTextfield
                  type="password"
                  [value]="confirmPassword()"
                  (input.zoneless)="
                    confirmPassword.set(confirmRegPasswordInput.value)
                  "
                  [attr.aria-invalid]="
                    validate() && confirmPassword() !== password()
                      ? 'true'
                      : null
                  "
                  autocomplete="new-password"
                />
                <tui-icon tuiPassword />
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
                  [disabled]="loading()"
                >
                  {{ 'signIn' | translate }}
                </button>
                <div class="text-center text-[var(--tui-text-02)]">
                  {{ 'auth.noAccount' | translate }}
                  <button
                    type="button"
                    tuiButton
                    appearance="flat"
                    (click.zoneless)="toggleRegister()"
                  >
                    {{ 'register' | translate }}
                  </button>
                </div>
              } @else {
                <button
                  tuiButton
                  type="button"
                  class="w-full"
                  [disabled]="loading()"
                  (click.zoneless)="submitRegister()"
                >
                  {{ 'register' | translate }}
                </button>
                <div class="text-center text-[var(--tui-text-02)]">
                  {{ 'auth.alreadyAccount' | translate }}
                  <button
                    type="button"
                    tuiButton
                    appearance="flat"
                    (click.zoneless)="toggleRegister(false)"
                  >
                    {{ 'signIn' | translate }}
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
                'newPassword' | translate
              }}</label>
              <input
                id="newPasswordInput"
                #newPasswordInput
                tuiTextfield
                type="password"
                [value]="newPassword()"
                (input.zoneless)="newPassword.set(newPasswordInput.value)"
                [attr.aria-invalid]="
                  validate() && !newPasswordValid() ? 'true' : null
                "
                autocomplete="new-password"
              />
              <tui-icon tuiPassword />
            </tui-textfield>

            @if (validate() && !newPasswordValid()) {
              <tui-notification appearance="warning">
                <h3 tuiTitle>
                  {{ 'auth.passwordRequirements' | translate: { min: 6 } }}
                </h3>
              </tui-notification>
            }

            <tui-textfield>
              <label tuiLabel for="confirmPasswordInput">{{
                'confirmPassword' | translate
              }}</label>
              <input
                id="confirmPasswordInput"
                #confirmPasswordInput
                tuiTextfield
                type="password"
                [value]="confirmPassword()"
                (input.zoneless)="
                  confirmPassword.set(confirmPasswordInput.value)
                "
                [attr.aria-invalid]="
                  validate() && confirmPassword() !== newPassword()
                    ? 'true'
                    : null
                "
                autocomplete="new-password"
              />
              <tui-icon tuiPassword />
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
                [disabled]="loading()"
              >
                {{ 'auth.setNewPassword' | translate }}
              </button>
            </footer>
          }
        </form>
      </div>
      <div
        class="absolute inset-0 md:static w-full md:w-2/5 h-full z-0 pointer-events-none"
      >
        <img
          ngSrc="/image/login-background.webp"
          alt="Background image"
          class="w-full h-full object-cover filter grayscale opacity-40 md:opacity-70"
          height="446"
          width="294"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-full' },
})
export class LoginComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

  private isComplexPassword(p: string): boolean {
    return (
      p.length >= 6 &&
      /[A-Z]/.test(p) &&
      /[a-z]/.test(p) &&
      /[0-9]/.test(p) &&
      /[^A-Za-z0-9]/.test(p)
    );
  }

  readonly passwordValid = computed(() =>
    this.isComplexPassword(this.password()),
  );

  readonly newPasswordValid = computed(() =>
    this.isComplexPassword(this.newPassword()),
  );

  readonly canSignIn = computed(
    () => this.emailValid() && this.password().length > 0,
  );
  readonly canRegister = computed(
    () =>
      this.emailValid() &&
      this.passwordValid() &&
      this.confirmPassword() === this.password(),
  );

  constructor() {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      if (params['register'] === 'true') {
        this.isRegister.set(true);
      }
    });

    // Ensure that when entering from a recovery link, the token is exchanged and there is an active session
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
      void this.router.navigateByUrl('/home');
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
      // Switch back to login view
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
        // Important: we redirect to /login with recovery_flag to avoid falling into '/home'
        // by the root redirect in both SSR and client router.
        // Supabase will add its hash with tokens and 'type=recovery', which this component detects.
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
    if (!this.newPasswordValid()) {
      this.error.set('auth.passwordRequirements');
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
    } catch {
      this.error.set('errors.unexpected');
    } finally {
      this.loading.set(false);
    }
  }
}
