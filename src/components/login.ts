import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { GlobalData } from '../services';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [TranslatePipe, TuiButton],
  template: `
    <form
      class="w-full max-w-sm mx-auto p-6 rounded-2xl border border-[color:var(--tui-border-normal)] shadow-sm bg-[color:var(--tui-base-01)]"
      (submit.zoneless)="submit($event)"
    >
      <div class="flex items-center mb-4">
        <div>
          <h1 class="text-xl font-semibold leading-5">
            {{ 'auth.login' | translate }}
          </h1>
          <p class="text-xs opacity-70 mt-1">
            {{ 'common.appName' | translate }}
          </p>
        </div>
      </div>
      @let err = error();
      @if (err) {
        <div class="mb-3 text-red-500 text-sm" role="alert">
          {{ err | translate }}
        </div>
      }
      <label class="block mb-3">
        <span class="text-sm opacity-80">{{
          'labels.username' | translate
        }}</span>
        <input
          class="mt-1 w-full px-3 py-2 rounded-lg border bg-transparent"
          [value]="username()"
          (input.zoneless)="onInputUsername($any($event.target).value)"
          autocomplete="username"
        />
      </label>
      <label class="block mb-5">
        <span class="text-sm opacity-80">{{
          'labels.password' | translate
        }}</span>
        <input
          type="password"
          class="mt-1 w-full px-3 py-2 rounded-lg border bg-transparent"
          [value]="password()"
          (input.zoneless)="onInputPassword($any($event.target).value)"
          autocomplete="current-password"
        />
      </label>
      <button
        tuiButton
        appearance="primary"
        size="l"
        type="submit"
        class="w-full"
      >
        {{ 'actions.signIn' | translate }}
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow items-center justify-center p-6' },
})
export class LoginComponent {
  private readonly global = inject(GlobalData);
  private readonly router = inject(Router);

  username = signal('');
  password = signal('');
  error = signal<string | null>(null);

  onInputUsername(value: string) {
    this.username.set(value);
  }

  onInputPassword(value: string) {
    this.password.set(value);
  }

  submit(evt?: Event) {
    evt?.preventDefault?.();
    const ok = this.global.login(this.username(), this.password());
    if (ok) {
      this.error.set(null);
      this.router.navigateByUrl('/home');
    } else {
      this.error.set('errors.invalidCredentials');
    }
  }
}
