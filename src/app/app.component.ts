import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { TuiButton, TuiRoot } from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, merge, startWith } from 'rxjs';

import { GlobalData, OfflineService } from '../services';

import { HeaderComponent } from '../components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, HeaderComponent, TranslatePipe, TuiButton],
  template: `
    <tui-root class="overflow-hidden" [attr.tuiTheme]="global.selectedTheme()">
      <div class="h-[100dvh] flex flex-col">
        <!-- Offline banner -->
        @if (!offline.isOnline()) {
          <div class="bg-amber-500 text-black text-sm px-3 py-2 text-center">
            {{ 'messages.offline' | translate }}
          </div>
        }
        <!-- Update banner -->
        @if (offline.isUpdateAvailable()) {
          <div
            class="bg-blue-600 text-white text-sm px-3 py-2 text-center flex items-center justify-center gap-4"
          >
            <span>{{ 'messages.updateAvailable' | translate }}</span>
            <button
              tuiButton
              type="button"
              size="s"
              appearance="secondary-accent"
              (click.zoneless)="offline.applyUpdate()"
            >
              {{ 'actions.update' | translate }}
            </button>
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
