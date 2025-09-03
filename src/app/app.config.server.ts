import { provideServerRendering } from '@angular/ssr';
import {
  mergeApplicationConfig,
  ApplicationConfig,
  inject,
} from '@angular/core';
import { appConfig } from './app.config';
import { UNIVERSAL_PROVIDERS } from '@ng-web-apis/universal';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, from, of } from 'rxjs';

// Define interface for translation data
interface TranslationData {
  [key: string]: string | TranslationData;
}

// Helpers de entorno
const isEdgeRuntime = () =>
  typeof (globalThis as unknown as { Deno?: unknown }).Deno !== 'undefined';

// Custom TranslateLoader para SSR compatible con Edge y Node (dev)
export class TranslateServerLoader implements TranslateLoader {
  constructor(
    private request?: Request, // Inyectado por Netlify SSR si está disponible
    private prefix = 'i18n',
    private suffix = '.json',
  ) {}

  getTranslation(lang: string): Observable<TranslationData> {
    // 1) Si tenemos Request (Edge/Netlify SSR), usar fetch con URL absoluta
    if (this.request) {
      try {
        const origin = new URL(this.request.url).origin;
        const url = `${origin}/${this.prefix}/${lang}${this.suffix}`;
        return from(
          fetch(url).then(async (res) => {
            if (!res.ok) {
              console.error(
                `Failed to fetch translation ${url}: ${res.status}`,
              );
              return {};
            }
            return (await res.json()) as TranslationData;
          }),
        );
      } catch (e) {
        console.error('Error building absolute URL for translations:', e);
        return of({});
      }
    }

    // 2) Sin Request:
    //    - En Edge no debemos usar Node APIs; devolvemos vacío para no romper
    if (isEdgeRuntime()) {
      console.warn('Edge runtime without Request; skipping SSR translations.');
      return of({});
    }

    //    - En SSR Node (dev): intentar cargar desde filesystem con import dinámico
    return from(
      (async () => {
        try {
          const [{ readFileSync }, { join }] = await Promise.all([
            import('fs'),
            import('path'),
          ]);

          const candidates = [
            join(process.cwd(), 'public', this.prefix, `${lang}${this.suffix}`),
            join(
              process.cwd(),
              'src',
              'public',
              this.prefix,
              `${lang}${this.suffix}`,
            ),
            join(
              process.cwd(),
              'dist',
              'local-walls',
              'browser',
              this.prefix,
              `${lang}${this.suffix}`,
            ),
          ];

          for (const p of candidates) {
            try {
              const content = readFileSync(p, 'utf8');
              return JSON.parse(content) as TranslationData;
            } catch {
              // probar siguiente ruta
            }
          }

          // 3) Último recurso en dev: fetch a un origin conocido
          const origin =
            process.env['ANGULAR_DEV_SERVER_ORIGIN'] || 'http://localhost:4200'; // usa http://localhost:8888 con `netlify serve`
          const url = `${origin}/${this.prefix}/${lang}${this.suffix}`;
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`Failed to fetch translation ${url}: ${res.status}`);
            return {};
          }
          return (await res.json()) as TranslationData;
        } catch (error) {
          console.error(`Error loading translation file for ${lang}:`, error);
          return {};
        }
      })(),
    );
  }
}

// Factory: inyecta el Request de Netlify si existe
export function translateServerLoaderFactory(): TranslateLoader {
  const req = inject('netlify.request' as unknown as any, {
    optional: true,
  }) as Request | undefined;
  return new TranslateServerLoader(req);
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    UNIVERSAL_PROVIDERS,
    // Override the TranslateLoader for server-side rendering
    {
      provide: TranslateLoader,
      useFactory: translateServerLoaderFactory,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
