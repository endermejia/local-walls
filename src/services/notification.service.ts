import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TuiAlertOptions, TuiAlertService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, switchMap } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { GdprNotificationComponent } from '../components/notifications/gdpr-notification';
import { UpdateNotificationComponent } from '../components/notifications/update-notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly alerts = inject(TuiAlertService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private isGdprShowing = false;
  private isUpdateShowing = false;

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

  showUpdateAvailable(): void {
    if (this.isUpdateShowing) {
      return;
    }

    this.isUpdateShowing = true;
    firstValueFrom(
      this.alerts.open(new PolymorpheusComponent(UpdateNotificationComponent), {
        label: this.translate.instant('update_available'),
        appearance: 'info',
        autoClose: 0,
      }),
      { defaultValue: undefined },
    ).finally(() => {
      this.isUpdateShowing = false;
    });
  }

  showGdpr(): void {
    if (this.isGdprShowing) {
      return;
    }

    this.isGdprShowing = true;

    this.translate
      .get('gdpr.title')
      .pipe(
        switchMap((translatedTitle) =>
          this.alerts.open(
            new PolymorpheusComponent(GdprNotificationComponent),
            {
              label: translatedTitle,
              appearance: 'info',
              autoClose: 0,
              closeable: false,
            },
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => {
          this.isGdprShowing = false;
        },
        error: () => {
          this.isGdprShowing = false;
        },
      });
  }
}
