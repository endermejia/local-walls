import { inject, Injectable } from '@angular/core';

import { TuiAlertOptions, TuiAlertService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

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
}
