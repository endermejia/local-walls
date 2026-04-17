import { provideServiceWorker } from '@angular/service-worker';
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
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';

import { provideTaiga } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { TUI_PLATFORM } from '@taiga-ui/cdk';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';

import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { CachedTranslateLoader } from '../services/cached-translate-loader';

import { errorInterceptor } from '../services/error.interceptor';
import { GlobalData } from '../services/global-data';
import { provideSupabaseConfig } from '../services/supabase.service';

import { routes } from './app.routes';
import {
  ENV_SUPABASE_ANON_KEY,
  ENV_SUPABASE_URL,
} from '../environments/environment';

const httpLoaderFactory: (http: HttpClient) => CachedTranslateLoader = (
  http: HttpClient,
) => new CachedTranslateLoader(http, '/i18n/', '.json');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
    ),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    provideClientHydration(
      withEventReplay(),
      withIncrementalHydration(),
      withHttpTransferCacheOptions({
        includePostRequests: true,
      }),
    ),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),
    provideTaiga(),
    provideEventPlugins(),
    {
      provide: TUI_PLATFORM,
      useValue: 'web',
    },
    {
      provide: TUI_LANGUAGE,
      useFactory: (global: GlobalData) => global.tuiLanguage,
      deps: [GlobalData],
    },
    provideSupabaseConfig({
      url: ENV_SUPABASE_URL,
      anonKey: ENV_SUPABASE_ANON_KEY,
    }),
    provideServiceWorker('service-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
  ],
};
