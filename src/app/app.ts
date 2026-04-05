import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { SeoService } from '../services/seo.service';
import { SupabaseService } from '../services/supabase.service';
import { Themes } from '../models';

import { TuiRoot } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiBadgedContent } from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, map, merge, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GlobalData } from '../services/global-data';
import { LocalStorage } from '../services/local-storage';

import { NavbarComponent } from '../components/ui/navbar';

import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    RouterOutlet,
    TranslateModule,
    TuiRoot,
    TuiBadgedContent,
  ],
  template: `
    <tui-root [attr.tuiTheme]="global.selectedTheme()">
      <div
        class="fixed inset-0 w-full h-full overflow-hidden flex flex-col-reverse md:flex-row"
      >
        @if (
          (global.userProfile() || !!this.supabase.session()) &&
          !['/login', '/signup'].includes(router.url) &&
          !router.url.startsWith('/reset-password')
        ) {
          <app-navbar />
        }
        <main class="flex-1 min-h-0 relative flex flex-col overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </tui-root>
  `,
})
export class AppComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private translate = inject(TranslateService);
  private storage = inject(LocalStorage);
  private readonly dialogs = inject(TuiDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(SeoService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);

  private readonly gdprKey = 'lw_gdpr_accepted';

  protected readonly supabase = inject(SupabaseService);

  private readonly langChange = toSignal(
    merge(
      this.translate.onLangChange.pipe(map(() => true)),
      this.translate.onDefaultLangChange.pipe(map(() => true)),
    ).pipe(startWith(true)),
  );

  constructor() {
    effect(() => {
      if (
        isPlatformBrowser(this.platformId) &&
        this.storage.getItem(this.gdprKey) !== 'true'
      ) {
        this.notifications.showGdpr();
      }
    });

    effect(() => {
      if (this.langChange()) {
        this.updateSeoTags();
      }
    });

    effect(() => {
      const theme = this.global.selectedTheme();
      if (isPlatformBrowser(this.platformId)) {
        const color = theme === Themes.DARK ? '#0b1220' : '#ffffff';
        this.meta.updateTag({ name: 'theme-color', content: color });
      }
    });

    if (isPlatformBrowser(this.platformId) && this.swUpdate.isEnabled) {
      // Check for updates on navigation
      this.router.events
        .pipe(
          filter((event) => event instanceof NavigationEnd),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          this.swUpdate.checkForUpdate().catch((err) => {
            console.error('Error checking for updates', err);
          });
        });

      // Check for updates every hour
      const oneHour = 60 * 60 * 1000;
      setInterval(() => {
        this.swUpdate.checkForUpdate().catch((err) => {
          console.error('Error checking for updates', err);
        });
      }, oneHour);

      // Reload when update is ready
      this.swUpdate.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          this.notifications.showUpdateAvailable();
        });
    }
  }

  private updateSeoTags() {
    const appTitle = this.translate.instant('seo.title');
    const description = this.translate.instant('seo.description');

    if (appTitle === 'seo.title' || !appTitle) return;

    // Update <html lang> attribute to reflect active language
    const lang = this.translate.currentLang || this.translate.defaultLang;
    if (this.doc?.documentElement) {
      this.doc.documentElement.lang = lang ?? 'es';
    }

    this.seo.setPage({
      title: appTitle,
      description,
    });
  }
}
