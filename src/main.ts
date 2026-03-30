import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { injectSpeedInsights } from '@vercel/speed-insights';

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

injectSpeedInsights();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
