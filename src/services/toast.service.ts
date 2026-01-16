import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { TuiToastOptions, TuiToastService } from '@taiga-ui/kit';
import { TranslateService } from '@ngx-translate/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { LoaderDialogComponent } from '../components/loader-dialog';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toast = inject(TuiToastService);
  private readonly dialog = inject(TuiDialogService);
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

  showLoader(message: string): Subject<void> {
    const close$ = new Subject<void>();
    const translatedMessage = this.translate.instant(message);

    void firstValueFrom(
      this.dialog
        .open(new PolymorpheusComponent(LoaderDialogComponent), {
          data: translatedMessage,
          dismissible: false,
          size: 's',
          closable: false,
        })
        .pipe(takeUntil(close$)),
    );

    return close$;
  }
}
