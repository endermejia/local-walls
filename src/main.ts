import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
