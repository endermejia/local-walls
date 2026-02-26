import { inject, Injectable } from '@angular/core';

import { TuiAlertOptions, TuiAlertService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { GdprNotificationComponent } from '../components/gdpr-notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly alerts = inject(TuiAlertService);
  private readonly translate = inject(TranslateService);

  private show(
    message: string,
    options?: Partial<TuiAlertOptions<unknown>>,
  ): void {
    const translatedMessage = this.translate.instant(message);
    void firstValueFrom(
      this.alerts.open(translatedMessage, {
        ...options,
      }),
      { defaultValue: undefined },
    );
  }

  success(
    message: string,
    label?: string,
    autoClose: number | boolean | undefined = 3000,
  ): void {
    this.show(message, {
      appearance: 'positive',
      label: label ? this.translate.instant(label) : undefined,
      autoClose: autoClose === false ? 0 : (autoClose as number | undefined),
    });
  }

  error(
    message: string,
    label?: string,
    autoClose: number | boolean | undefined = 3000,
  ): void {
    this.show(message, {
      appearance: 'negative',
      label: label ? this.translate.instant(label) : undefined,
      autoClose: autoClose === false ? 0 : (autoClose as number | undefined),
    });
  }

  info(
    message: string,
    label?: string,
    autoClose: number | boolean | undefined = 3000,
  ): void {
    this.show(message, {
      appearance: 'info',
      label: label ? this.translate.instant(label) : undefined,
      autoClose: autoClose === false ? 0 : (autoClose as number | undefined),
    });
  }

  warning(
    message: string,
    label?: string,
    autoClose: number | boolean | undefined = 3000,
  ): void {
    this.show(message, {
      appearance: 'warning',
      label: label ? this.translate.instant(label) : undefined,
      autoClose: autoClose === false ? 0 : (autoClose as number | undefined),
    });
  }

  private gdprSubscription?: Subscription;
  private isGdprShowing = false;

  showGdpr(): void {
    if (this.isGdprShowing) {
      return;
    }

    this.isGdprShowing = true;

    // Ensure translations are loaded before showing
    this.translate.get('gdpr.title').subscribe((translatedTitle) => {
      this.gdprSubscription = this.alerts
        .open(new PolymorpheusComponent(GdprNotificationComponent), {
          label: translatedTitle,
          appearance: 'info',
          autoClose: 0,
          closeable: false,
        })
        .subscribe({
          complete: () => {
            this.isGdprShowing = false;
            this.gdprSubscription = undefined;
          },
          error: () => {
            this.isGdprShowing = false;
            this.gdprSubscription = undefined;
          },
        });
    });
  }
}
