import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { UNIVERSAL_PROVIDERS } from '@ng-web-apis/universal';
import { TranslateLoader } from '@ngx-translate/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// Define interface for translation data
interface TranslationData {
  [key: string]: string | TranslationData;
}

// Custom TranslateLoader for SSR that loads translations from the filesystem
export class TranslateServerLoader implements TranslateLoader {
  constructor(
    private prefix = 'i18n',
    private suffix = '.json',
  ) {}

  getTranslation(lang: string): Observable<TranslationData> {
    try {
      // During SSR, we need to load the translations from the filesystem
      const path = join(
        process.cwd(),
        'public',
        this.prefix,
        `${lang}${this.suffix}`,
      );
      const content = readFileSync(path, 'utf8');
      return of(JSON.parse(content));
    } catch (e) {
      console.error(`Error loading translation file for ${lang}:`, e);
      return of({});
    }
  }
}

// Factory function to create the server-side TranslateLoader
export function translateServerLoaderFactory(): TranslateLoader {
  return new TranslateServerLoader();
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    UNIVERSAL_PROVIDERS,
    // Override the TranslateLoader for server-side rendering
    {
      provide: TranslateLoader,
      useFactory: translateServerLoaderFactory,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
