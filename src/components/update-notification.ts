import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineService } from '../services';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [TuiButton, TranslatePipe],
  template: `
    <div class="flex items-center justify-between gap-4">
      <span>{{ 'messages.updateAvailable' | translate }}</span>
      <button
        tuiButton
        type="button"
        size="s"
        appearance="primary"
        (click.zoneless)="update()"
      >
        {{ 'actions.update' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateNotificationComponent {
  private readonly offline = inject(OfflineService);

  update() {
    void this.offline.applyUpdate();
  }
}
