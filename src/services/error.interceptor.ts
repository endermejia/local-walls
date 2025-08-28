import { HttpInterceptorFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { GlobalData } from './global-data';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  const global = inject(GlobalData);
  return next(req).pipe(
    catchError((err: unknown) => {
      const anyErr = err as any;
      const msg =
        anyErr?.error?.message || anyErr?.message || 'Unexpected error';
      try {
        global.setError(msg);
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
