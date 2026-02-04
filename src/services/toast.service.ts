import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiToastOptions, TuiToastService } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, type Observable, Subject, takeUntil } from 'rxjs';

import { LoaderDialogComponent } from '../dialogs/loader-dialog';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toast = inject(TuiToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  private show(
    message: string,
    options?: Partial<TuiToastOptions<unknown>> | undefined,
    autoClose = 3000,
  ): void {
    const translatedMessage = this.translate.instant(message);
    void firstValueFrom(
      this.toast.open(translatedMessage, {
        autoClose,
        ...options,
      }),
    );
  }

  success(message: string): void {
    this.show(message, {
      appearance: 'positive',
      data: '@tui.check-circle',
    });
  }

  error(message: string): void {
    this.show(message, { appearance: 'negative', data: '@tui.circle-x' });
  }

  info(message: string): void {
    this.show(message, { appearance: 'info', data: '@tui.info' });
  }

  warning(message: string): void {
    this.show(message, { appearance: 'warning', data: '@tui.circle-alert' });
  }

  showLoader(message: string, progress$?: Observable<number>): Subject<void> {
    const close$ = new Subject<void>();
    const translatedMessage = this.translate.instant(message);

    void firstValueFrom(
      this.dialogs
        .open(new PolymorpheusComponent(LoaderDialogComponent), {
          data: progress$
            ? { message: translatedMessage, progress$ }
            : translatedMessage,
          dismissible: false,
          size: 's',
          closable: false,
        })
        .pipe(takeUntil(close$)),
    );

    return close$;
  }
}
