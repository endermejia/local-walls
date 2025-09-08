import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { GlobalData } from '../services';
import { Router } from '@angular/router';
import {
  TuiAppearance,
  TuiButton,
  TuiNotification,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiHeader, TuiCardLarge, TuiForm } from '@taiga-ui/layout';

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
      (submit.zoneless)="submit($event)"
    >
      <header tuiHeader>
        <h2 tuiTitle>
          {{ 'auth.login' | translate }}
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

      <tui-textfield>
        <label tuiLabel for="usernameInput">{{
          'labels.username' | translate
        }}</label>
        <input
          id="usernameInput"
          tuiTextfield
          [value]="username()"
          (input.zoneless)="onInputUsername($any($event.target).value)"
          autocomplete="username"
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
          [value]="password()"
          (input.zoneless)="onInputPassword($any($event.target).value)"
          autocomplete="current-password"
        />
      </tui-textfield>

      <footer>
        <button tuiButton type="submit" class="w-full">
          {{ 'actions.signIn' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow items-center justify-center p-6' },
})
export class LoginComponent {
  private readonly global = inject(GlobalData);
  private readonly router = inject(Router);

  username: WritableSignal<string> = signal('');
  password: WritableSignal<string> = signal('');
  error: WritableSignal<string | null> = signal<string | null>(null);

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
