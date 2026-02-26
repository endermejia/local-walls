import { Component, inject, signal } from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';
import { TuiAlertContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorage } from '../services/local-storage';

@Component({
  selector: 'app-gdpr-notification',
  standalone: true,
  imports: [TuiButton, TuiScrollbar, TranslateModule],
  template: `
    <div class="flex flex-col gap-4">
      <div class="max-h-[40vh] flex flex-col">
        <tui-scrollbar class="h-full">
          <div
            class="text-sm leading-relaxed"
            [innerHTML]="
              (showFull() ? 'gdpr.fullPolicy' : 'gdpr.message') | translate
            "
          ></div>
        </tui-scrollbar>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          tuiButton
          type="button"
          size="s"
          appearance="flat"
          class="!font-medium"
          (click)="showFull.set(!showFull())"
        >
          {{ (showFull() ? 'back' : 'gdpr.readMore') | translate }}
        </button>
        <button
          tuiButton
          type="button"
          size="s"
          appearance="primary"
          class="min-w-24"
          (click)="accept()"
        >
          {{ 'gdpr.accept' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class GdprNotificationComponent {
  private readonly context =
    inject<TuiAlertContext<boolean, void>>(POLYMORPHEUS_CONTEXT);
  private readonly storage = inject(LocalStorage);
  private readonly gdprKey = 'lw_gdpr_accepted';

  protected readonly showFull = signal(false);

  accept(): void {
    this.storage.setItem(this.gdprKey, 'true');
    this.context.completeWith(true);
  }
}
