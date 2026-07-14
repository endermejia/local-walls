import { provideServiceWorker } from '@angular/service-worker';
import {
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import {
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
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

import {
  provideTaiga,
  TUI_DARK_MODE,
  tuiHintOptionsProvider,
} from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { TUI_PLATFORM } from '@taiga-ui/cdk';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';

import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { CachedTranslateLoader } from '../services/cached-translate-loader';

import { errorInterceptor } from '../services/error.interceptor';
import { AppErrorHandler } from '../services/app-error-handler';
import { GlobalData } from '../services/global-data';
import { provideSupabaseConfig } from '../services/supabase.service';
import { SelectivePreloadingStrategy } from './selective-preloading.strategy';

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
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(SelectivePreloadingStrategy),
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
    tuiHintOptionsProvider({
      appearance: 'floating',
    }),
    provideTaiga(),
    provideEventPlugins(),
    {
      provide: TUI_PLATFORM,
      useValue: 'web',
    },
    {
      provide: TUI_DARK_MODE,
      useValue: signal(false),
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
