import { TuiRoot } from '@taiga-ui/core';
import { Component, inject, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components';
import { GlobalData, LocalStorage, OfflineService } from '../services';
import { TranslateService } from '@ngx-translate/core';
import { Meta, Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, HeaderComponent],
  template: `
    <tui-root class="overflow-hidden" [attr.tuiTheme]="global.selectedTheme()">
      <div class="h-[100dvh] flex flex-col">
        <!-- Offline banner -->
        @if (!offline.isOnline()) {
          <div class="bg-amber-500 text-black text-sm px-3 py-2 text-center">
            Estás sin conexión. Algunas funciones pueden no estar disponibles.
          </div>
        }
        @if (showHeader()) {
          <app-header />
        }
        <router-outlet />
      </div>
    </tui-root>
  `,
})
export class AppComponent {
  protected global = inject(GlobalData);
  protected offline = inject(OfflineService);
  private localStorage = inject(LocalStorage);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private title = inject(Title);
  private meta = inject(Meta);

  // Señal derivada de la URL actual para decidir si mostrar el header
  protected currentUrl = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected showHeader = computed(
    () => !this.currentUrl().startsWith('/login'),
  );

  constructor() {
    const localStorageLang = this.localStorage.getItem('language');
    if (localStorageLang === 'es' || localStorageLang === 'en') {
      this.global.selectedLanguage.set(localStorageLang);
      this.translate.use(localStorageLang);
    } else {
      this.translate.use(this.global.selectedLanguage());
    }
    const localStorageTheme = this.localStorage.getItem('theme');
    if (localStorageTheme === 'dark' || localStorageTheme === 'light') {
      this.global.selectedTheme.set(localStorageTheme as 'dark' | 'light');
    }

    // SEO: Set title and meta tags (SSR-safe)
    const appTitle = 'Roca nostra 🤫';
    const description =
      'App de croquis de escalada hechos por equipadores locales. Encuentra y comparte zonas de escalada, sectores y vías cerca de ti.';

    this.title.setTitle(appTitle);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: appTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: appTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }
}
