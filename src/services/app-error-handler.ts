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

    if (error instanceof Error) {
      const msg = error.message || '';
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('network')
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
      void firstValueFrom(
        this.dialogs.open(new PolymorpheusComponent(ErrorDialogComponent), {
          label: this.translate.instant('errors.unexpected'),
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
