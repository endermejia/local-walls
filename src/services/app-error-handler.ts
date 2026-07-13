import { ErrorHandler, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ErrorDialogComponent } from '../components/dialogs/error-dialog';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private isOpen = false;

  handleError(error: unknown): void {
    console.error('[AppErrorHandler]', error);

    if (!isPlatformBrowser(this.platformId)) return;

    let messageKey = 'errors.unexpected';

    if (error) {
      const errorObj = error as Record<string, unknown>;
      const innerError = errorObj['error'] as
        | Record<string, unknown>
        | undefined;
      const msg = String(
        errorObj['message'] ||
          innerError?.['message'] ||
          errorObj['messageKey'] ||
          error ||
          '',
      );
      const status = errorObj['status'] ?? errorObj['statusCode'];
      const name = errorObj['name'];

      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('network') ||
        msg.includes('offline') ||
        status === 0 ||
        name === 'TimeoutError'
      ) {
        messageKey = 'errors.network';
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        messageKey = 'errors.network';
      }
    }

    this.showError(messageKey);
  }

  private showError(messageKey: string): void {
    if (this.isOpen) return;

    this.isOpen = true;

    void firstValueFrom(this.translate.get(messageKey)).then((message) => {
      const titleKey =
        messageKey === 'errors.network'
          ? 'errors.networkTitle'
          : 'errors.unexpected';
      void firstValueFrom(
        this.dialogs.open(new PolymorpheusComponent(ErrorDialogComponent), {
          label: this.translate.instant(titleKey),
          data: {
            message,
          },
          size: 's',
          closable: true,
        }),
      ).finally(() => {
        this.isOpen = false;
      });
    });
  }
}
