import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { TuiRoot } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { map, merge, startWith } from 'rxjs';

import { GlobalData, OfflineService } from '../services';

import { HeaderComponent } from '../components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, HeaderComponent],
  template: `
    <tui-root class="overflow-hidden" [attr.tuiTheme]="global.selectedTheme()">
      <div class="h-[100dvh] flex flex-col">
        <!-- Offline banner -->
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
  private offlineService = inject(OfflineService);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private translate = inject(TranslateService);

  // Signal derived from the current URL to decide whether to show the header
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

  private readonly langChange = toSignal(
    merge(
      this.translate.onLangChange.pipe(map(() => true)),
      this.translate.onDefaultLangChange.pipe(map(() => true)),
    ).pipe(startWith(true)),
  );

  constructor() {
    // SEO: Set title and meta tags (SSR-safe)
    effect(() => {
      if (this.langChange()) {
        this.updateSeoTags();
      }
    });

    // Start offline sync in background
    void this.global.syncOfflineContent();
  }

  private updateSeoTags() {
    const appTitle = this.translate.instant('seo.title');
    const description = this.translate.instant('seo.description');

    if (appTitle === 'seo.title' || !appTitle) return;

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
