import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';
import { toObservable } from '@angular/core/rxjs-interop';
import { GlobalData } from '../services';
import { errorInterceptor } from '../services';

import { routes } from './app.routes';

const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (
  http: HttpClient,
) => new TranslateHttpLoader(http, '/i18n/', '.json');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),
    provideEventPlugins(),
    {
      provide: TUI_LANGUAGE,
      useFactory: (global: GlobalData) => {
        return toObservable(global.tuiLanguage);
      },
      deps: [GlobalData],
    },
  ],
};
