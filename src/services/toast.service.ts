import { inject, Injectable } from '@angular/core';
import { TuiToastOptions, TuiToastService } from '@taiga-ui/kit';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toast = inject(TuiToastService);
  private readonly translate = inject(TranslateService);

  private show(
    message: string,
    options?: Partial<TuiToastOptions<unknown>> | undefined,
  ): void {
    const translatedMessage = this.translate.instant(message);
    this.toast
      .open(translatedMessage, {
        ...options,
      })
      .subscribe();
  }

  success(message: string): void {
    this.show(message, { appearance: 'positive', data: '@tui.check-circle' });
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
}
