import { ErrorHandler, inject, Injectable } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';
import { ErrorLogService } from './error-log.service';

const CHUNK_RELOAD_KEY = 'lw_chunk_reload_ts';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly errorLogService = inject(ErrorLogService);

  handleError(error: unknown): void {
    const msg = this.extractMessage(error);
    const trimmed = msg.trim();

    // 0. Empty, blank, or meaningless cancellation/rejection errors that should never be logged
    if (
      !trimmed ||
      trimmed === '{"message":""}' ||
      trimmed === '{}' ||
      trimmed === 'null' ||
      trimmed === 'undefined'
    ) {
      return;
    }

    // 1. Benign browser notifications that should never be logged
    if (
      /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i.test(
        msg,
      )
    ) {
      return;
    }

    // 2. Aborted requests/cancellations (e.g. user navigated away before fetch completed)
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: unknown }).name === 'AbortError') ||
      /AbortError|signal is aborted without reason|The user aborted a request/i.test(
        msg,
      )
    ) {
      return;
    }

    // 3. Dynamic import chunk loading errors (stale bundle after redeployment/dev rebuild)
    if (
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk [\d]+ failed/i.test(
        msg,
      )
    ) {
      if (this.isBrowser) {
        try {
          const now = Date.now();
          const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
          if (now - last > 15000) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
            window.location.reload();
            return;
          }
        } catch {
          // ignore session storage access failures
        }
      }
      this.errorLogService.logError(error, 'warning', 'AppErrorHandler');
      return;
    }

    // 4. RxJS EmptyError (no elements in sequence) - demote to warning
    if (/no elements in sequence/i.test(msg)) {
      this.errorLogService.logError(error, 'warning', 'AppErrorHandler');
      return;
    }

    // Log all other unexpected errors to database via ErrorLogService without printing to console
    this.errorLogService.logError(error, 'critical', 'AppErrorHandler');
  }

  private extractMessage(error: unknown, depth = 0): string {
    if (depth > 5 || !error) {
      return '';
    }
    if (error instanceof Error) {
      if (
        error.message &&
        error.message !== '[object Object]' &&
        error.message !== 'Error'
      ) {
        return error.message;
      }
      if ('cause' in error && error.cause) {
        const causeMsg = this.extractMessage(error.cause, depth + 1);
        if (causeMsg) return causeMsg;
      }
      return error.message || '';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      const rec = error as Record<string, unknown>;
      if (
        typeof rec['message'] === 'string' &&
        rec['message'].trim() &&
        rec['message'] !== '[object Object]'
      ) {
        return rec['message'];
      }
      if (rec['cause']) {
        const causeMsg = this.extractMessage(rec['cause'], depth + 1);
        if (causeMsg) return causeMsg;
      }
      if (rec['error']) {
        const innerMsg = this.extractMessage(rec['error'], depth + 1);
        if (innerMsg) return innerMsg;
      }
      if (typeof rec['details'] === 'string' && rec['details'].trim()) {
        return rec['details'];
      }
      try {
        const json = JSON.stringify(error);
        if (json && json !== '{}' && json !== '{"message":""}') {
          return json;
        }
      } catch {
        // ignore cyclic
      }
    }
    return String(error ?? '');
  }
}
