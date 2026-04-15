import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';

import { injectSpeedInsights } from '@vercel/speed-insights';

import { AppComponent } from './app/app';

import { appConfig } from './app/app.config';

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');

injectSpeedInsights();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
