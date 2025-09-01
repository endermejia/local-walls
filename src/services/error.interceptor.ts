import { HttpInterceptorFn, HttpEvent } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { GlobalData } from './global-data';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  const injector = inject(Injector);
  return next(req).pipe(
    catchError((err: unknown) => {
      const anyErr = err as {
        error?: { message?: string };
        message?: string;
      } | null;
      const msg =
        anyErr?.error?.message ?? anyErr?.message ?? 'Unexpected error';
      try {
        const global = injector.get(GlobalData);
        // Update global error state if available
        global?.setError?.(msg);
        if (typeof console !== 'undefined') {
          console.error('HTTP Error:', err);
        }
      } catch {
        // no-op
      }
      return throwError(() => err);
    }),
  );
};
