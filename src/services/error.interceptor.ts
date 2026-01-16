import { isPlatformBrowser } from '@angular/common';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, Injector, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';

export const errorInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  const injector = inject(Injector);
  const platformId = inject(PLATFORM_ID);
  const router = isPlatformBrowser(platformId)
    ? injector.get(Router, null, { optional: true })
    : null;
  const supabase = isPlatformBrowser(platformId)
    ? injector.get(SupabaseService, null, { optional: true })
    : null;

  return next(req).pipe(
    catchError((err: unknown) => {
      const httpErr = err as HttpErrorResponse | null;
      const status = httpErr?.status ?? 0;

      // Derive a message for global error state
      const msg =
        (httpErr?.error as { message?: string } | undefined)?.message ||
        httpErr?.message ||
        'errors.unexpected';

      // Update global error state (best-effort)
      try {
        const global = injector.get(GlobalData);
        global?.setError?.(msg);
        if (typeof console !== 'undefined') {
          console.error('HTTP Error:', err);
        }
      } catch {
        // no-op
      }

      // Skip redirect logic on the server and for static/i18n assets
      const isBrowser = isPlatformBrowser(platformId);
      const url = req.url || '';
      const isStatic =
        url.startsWith('/i18n/') ||
        url.startsWith('/assets/') ||
        url.endsWith('.svg') ||
        url.endsWith('.png') ||
        url.endsWith('.jpg') ||
        url.endsWith('.css') ||
        url.endsWith('.js');

      if (isBrowser && !isStatic && (status === 401 || status === 403)) {
        // Prefer a local logout to clear client session and navigate to /login.
        // This avoids SSR/Edge issues and 403 from Supabase global scope.
        try {
          void supabase?.logout();
        } catch {
          // fallback: try direct navigation if logout fails for any reason
          try {
            void router?.navigateByUrl('/login');
          } catch {
            // no-op
          }
        }
      }

      return throwError(() => err);
    }),
  );
};
