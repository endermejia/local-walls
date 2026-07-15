import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface AppErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorLogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'app_error_logs_v2';

  readonly errors = signal<AppErrorLog[]>(this.loadErrors());

  private loadErrors(): AppErrorLog[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  logError(error: unknown): void {
    if (!isPlatformBrowser(this.platformId)) return;

    let message = 'Unexpected error';
    let stack: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      const innerError = errorObj['error'] as
        | Record<string, unknown>
        | undefined;
      message = String(
        errorObj['message'] ||
          innerError?.['message'] ||
          errorObj['messageKey'] ||
          JSON.stringify(error),
      );
      stack = String(errorObj['stack'] || '');
    } else if (error) {
      message = String(error);
    }

    const newError: AppErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message,
      stack,
      url: window.location.href,
    };

    this.errors.update((logs) => {
      const updated = [newError, ...logs].slice(0, 100);
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(updated));
      } catch {
        // Storage full or disabled
      }
      return updated;
    });
  }

  clearErrors(): void {
    this.errors.set([]);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {}
    }
  }
}
