import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ErrorLogService } from './error-log.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly errorLogService = inject(ErrorLogService);

  handleError(error: unknown): void {
    console.error('[AppErrorHandler]', error);
    this.errorLogService.logError(error);
  }
}
