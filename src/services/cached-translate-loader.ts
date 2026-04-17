import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';

export class CachedTranslateLoader implements TranslateLoader {
  constructor(
    private http: HttpClient,
    private prefix: string = '/i18n/',
    private suffix: string = '.json',
  ) {}

  public getTranslation(lang: string): Observable<any> {
    const cacheKey = `cached_translation_${lang}_v1`;

    // Try to fetch from network first
    return this.http.get(`${this.prefix}${lang}${this.suffix}`).pipe(
      timeout(2000), // Wait max 2s before falling back to cache
      tap((translation) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify(translation));
          } catch (e) {
            console.warn('[CachedTranslateLoader] Error saving to cache', e);
          }
        }
      }),
      catchError((error) => {
        console.warn(
          `[CachedTranslateLoader] Network error fetching ${lang}, checking cache`,
          error,
        );
        if (typeof window !== 'undefined' && window.localStorage) {
          const cached = window.localStorage.getItem(cacheKey);
          if (cached) {
            try {
              return of(JSON.parse(cached));
            } catch (e) {
              console.error('[CachedTranslateLoader] Error parsing cache', e);
            }
          }
        }
        // Fallback to empty translation to avoid blocking app boot
        return of({});
      }),
    );
  }
}
