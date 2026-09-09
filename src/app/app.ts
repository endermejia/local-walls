import { DOCUMENT } from '@angular/common';
import {
  Component,
  afterNextRender,
  effect,
  inject,
  OnDestroy,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

import { TuiRoot } from '@taiga-ui/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { combineLatest, filter, map, merge, startWith } from 'rxjs';

import { CartService } from '../services/cart.service';
import { LocalStorage } from '../services/local-storage';
import { NotificationService } from '../services/notification.service';
import { RealtimeService } from '../services/realtime.service';
import { SeoService } from '../services/seo.service';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

import { CartOverlayComponent } from '../components/cart-overlay/cart-overlay';
import { NavbarComponent } from '../components/ui/navbar';
import { OfflineBannerComponent } from '../components/ui/offline-banner';

import { reactToObservable } from '../utils';

import { IS_BROWSER } from './is-browser';

@Component({
  selector: 'app-root',
  imports: [
    OfflineBannerComponent,
    CartOverlayComponent,
    NavbarComponent,
    RouterOutlet,
    TranslateModule,
    TuiRoot,
  ],
  template: `
    <tui-root [attr.tuiTheme]="theme()">
      <app-offline-banner />
      <div
        class="fixed inset-0 w-full h-full overflow-hidden flex flex-col-reverse md:flex-row"
      >
        @if (showNavbar()) {
          <app-navbar />
        }
        <main class="flex-1 min-h-0 relative flex flex-col overflow-y-auto">
          <router-outlet />
        </main>
      </div>

      @if (cartService.showCart()) {
        <app-cart-overlay
          (closeOverlay)="cartService.showCart.set(false)"
          (checkout)="onCheckout()"
        />
      }
    </tui-root>
  `,
})
export class AppComponent implements OnDestroy {
  protected readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  protected readonly cartService = inject(CartService);
  private swCheckInterval: ReturnType<typeof setInterval> | null = null;
  private suppressRogueSearch: ((e: KeyboardEvent) => void) | null = null;

  protected readonly theme = this.themeService.selectedTheme;
  protected readonly isDark = this.themeService.isDark;

  protected onCheckout(): void {
    this.cartService.showCart.set(false);
    void this.router.navigate(['/merchandising/checkout']);
  }
  private translate = inject(TranslateService);
  private storage = inject(LocalStorage);
  private readonly notifications = inject(NotificationService);
  protected readonly realtime = inject(RealtimeService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(SeoService);
  private readonly swUpdate = inject(SwUpdate);

  private readonly gdprKey = 'lw_gdpr_accepted';

  protected readonly supabase = inject(SupabaseService);

  protected readonly showNavbar = toSignal(
    combineLatest([
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
      ),
      toObservable(this.supabase.session),
    ]).pipe(
      map(([url, session]) => {
        const path = url.split('?')[0].split('#')[0];
        return (
          !!session &&
          !['/login', '/signup', '/info', '/reset-password'].some((p) =>
            path.startsWith(p),
          )
        );
      }),
    ),
    { initialValue: false },
  );

  private readonly langChange = toSignal(
    merge(
      this.translate.onLangChange.pipe(map(() => true)),
      this.translate.onDefaultLangChange.pipe(map(() => true)),
    ).pipe(startWith(true)),
  );

  constructor() {
    effect(() => {
      if (this.isBrowser && this.storage.getItem(this.gdprKey) !== 'true') {
        this.notifications.showGdpr();
      }
    });

    afterNextRender(() => {
      if (
        this.isBrowser &&
        this.storage.getItem('lw_update_applied') === 'true'
      ) {
        this.storage.removeItem('lw_update_applied');
        this.notifications.success('updateApplied');
      }
    });

    effect(() => {
      if (this.langChange()) {
        this.updateSeoTags();
      }
    });

    if (this.isBrowser) {
      // Intercept rogue hardware key events (e.g. OnePlus alert slider / physical mute switches)
      // which fire KEYCODE_SEARCH / DomKey: BrowserSearch / Find, triggering the browser's Find-in-page bar
      this.suppressRogueSearch = (e: KeyboardEvent) => {
        const key = e.key;
        const code = e.code;
        const keyCode = e.keyCode || e.which;

        const isRogue =
          key === 'BrowserSearch' ||
          key === 'Search' ||
          key === 'Find' ||
          code === 'BrowserSearch' ||
          code === 'Find' ||
          ((keyCode === 84 || keyCode === 170) && key !== 't' && key !== 'T');

        if (isRogue) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('keydown', this.suppressRogueSearch, {
        capture: true,
        passive: false,
      });
      window.addEventListener('keyup', this.suppressRogueSearch, {
        capture: true,
        passive: false,
      });
    }

    if (this.isBrowser && this.swUpdate.isEnabled) {
      // Check for updates immediately on startup
      void this.swUpdate.checkForUpdate().catch(() => {
        // Ignore errors
      });

      // Check for updates on navigation
      reactToObservable(
        this.router.events.pipe(
          filter((event) => event instanceof NavigationEnd),
        ),
        () => {
          void this.swUpdate.checkForUpdate().catch(() => {
            // Ignore errors
          });
        },
      );

      // Check for updates every hour
      const oneHour = 60 * 60 * 1000;
      this.swCheckInterval = setInterval(() => {
        void this.swUpdate.checkForUpdate().catch(() => {
          // Ignore errors
        });
      }, oneHour);

      // Auto-apply update and reload
      reactToObservable(
        this.swUpdate.versionUpdates.pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
        ),
        () => {
          this.storage.setItem('lw_update_applied', 'true');
          void this.swUpdate
            .activateUpdate()
            .then(() => {
              window.location.reload();
            })
            .catch(() => {
              window.location.reload();
            });
        },
      );

      // Handle unrecoverable state (corrupted cache)
      reactToObservable(this.swUpdate.unrecoverable, () => {
        this.storage.setItem('lw_update_applied', 'true');
        window.location.reload();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.suppressRogueSearch && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.suppressRogueSearch, {
        capture: true,
      });
      window.removeEventListener('keyup', this.suppressRogueSearch, {
        capture: true,
      });
      this.suppressRogueSearch = null;
    }
    if (this.swCheckInterval !== null) {
      clearInterval(this.swCheckInterval);
      this.swCheckInterval = null;
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
