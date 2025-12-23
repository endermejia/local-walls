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
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
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
    NgOptimizedImage,
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
              <span tuiSubtitle>{{ 'labels.appName' | translate }}</span>
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
                'labels.password' | translate
              }}</label>
              <input
                id="passwordInput"
                #passwordInput
                tuiTextfield
                type="password"
                [value]="password()"
                (input.zoneless)="onInputPassword(passwordInput.value)"
                [attr.aria-invalid]="
                  validate() && !passwordValid() ? 'true' : null
                "
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
        // Important: we redirect to login with recovery flag to avoid falling into '/explore'
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
