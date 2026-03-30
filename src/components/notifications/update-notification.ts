import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
  standalone: true,
  selector: 'app-update-notification',
  imports: [TuiButton, TranslateModule],
  template: `
    <div class="flex flex-col gap-3">
      <p>{{ 'update_available' | translate }}</p>
      <button
        tuiButton
        type="button"
        size="s"
        appearance="accent"
        (click)="reload()"
      >
        {{ 'update' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateNotificationComponent {
  reload(): void {
    window.location.reload();
  }
}
