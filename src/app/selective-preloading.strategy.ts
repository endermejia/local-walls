import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

const HIGH_DEMAND_ROUTES = ['/home', '/area'];

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const path = route.path;
    if (
      path &&
      HIGH_DEMAND_ROUTES.some((p) => path === p || path.startsWith(p + '/'))
    ) {
      return load();
    }
    return of(null);
  }
}
