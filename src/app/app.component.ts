import { TuiRoot } from '@taiga-ui/core';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components';
import { GlobalData, LocalStorage } from '../services';
import { TranslateService } from '@ngx-translate/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, HeaderComponent],
  template: `
    <tui-root
      class="overflow-hidden"
      [attr.tuiTheme]="globalService.selectedTheme()"
    >
      <div class="h-[100dvh] flex flex-col">
        <app-header />
        <router-outlet />
      </div>
    </tui-root>
  `,
})
export class AppComponent {
  protected globalService = inject(GlobalData);
  private localStorage = inject(LocalStorage);
  private translate = inject(TranslateService);
  private title = inject(Title);
  private meta = inject(Meta);

  constructor() {
    const localStorageLang = this.localStorage.getItem('language');
    if (localStorageLang === 'es' || localStorageLang === 'en') {
      this.globalService.selectedLanguage.set(localStorageLang);
      this.translate.use(localStorageLang);
    } else {
      this.translate.use(this.globalService.selectedLanguage());
    }
    const localStorageTheme = this.localStorage.getItem('theme');
    if (localStorageTheme === 'dark' || localStorageTheme === 'light') {
      this.globalService.selectedTheme.set(
        localStorageTheme as 'dark' | 'light',
      );
    }

    // SEO: Set title and meta tags (SSR-safe)
    const appTitle = 'Gabriel Mejía | Angular Developer';
    const description =
      'Senior Frontend Developer specialized in Angular, TypeScript, Signals, SSR and zoneless change detection. Portfolio, projects and contact.';

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
