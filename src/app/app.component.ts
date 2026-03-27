import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { SeoService } from '../services/seo.service';
import { SupabaseService } from '../services/supabase.service';
import { Themes } from '../models';

import { TuiAppearance, TuiButton, TuiRoot } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';
import { DragDropModule, type CdkDragEnd } from '@angular/cdk/drag-drop';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, firstValueFrom, map, merge, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GlobalData } from '../services/global-data';
import { LocalStorage } from '../services/local-storage';

import { NavbarComponent } from '../components/navbar';

import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../dialogs/notifications-dialog';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    RouterOutlet,
    TranslateModule,
    TuiButton,
    TuiRoot,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiAppearance,
    DragDropModule,
  ],
  template: `
    <tui-root [attr.tuiTheme]="global.selectedTheme()">
      <div class="h-[100dvh] flex flex-col-reverse md:flex-row">
        @if (showHeader()) {
          <app-navbar />
        }
        <main class="flex-1 min-h-0 relative flex flex-col overflow-y-auto">
          <router-outlet />

          @if (showHeader()) {
            <div
              cdkDrag
              (cdkDragStarted)="onDragStarted()"
              (cdkDragEnded)="onDragEnded($event)"
              [cdkDragFreeDragPosition]="dragPosition()"
              class="fixed bottom-20 right-4 flex flex-col items-end gap-2 z-[100] md:hidden"
              style="touch-action: none"
            >
              <tui-badged-content [style.--tui-radius.%]="50" cdkDragHandle>
                @if (global.unreadMessagesCount(); as unreadMessages) {
                  <tui-badge-notification
                    tuiAppearance="accent"
                    size="s"
                    tuiSlot="top"
                  >
                    {{ unreadMessages }}
                  </tui-badge-notification>
                }
                <button
                  tuiButton
                  type="button"
                  appearance="primary-grayscale"
                  size="m"
                  class="!rounded-full aspect-square md:aspect-auto md:!px-4 flex items-center justify-center"
                  iconStart="@tui.messages-square"
                  (click)="openChat()"
                  [attr.aria-label]="'messages' | translate"
                ></button>
              </tui-badged-content>

              @if (!global.userProfile()?.private) {
                <tui-badged-content [style.--tui-radius.%]="50" cdkDragHandle>
                  @if (
                    global.unreadNotificationsCount();
                    as unreadNotifications
                  ) {
                    <tui-badge-notification
                      tuiAppearance="accent"
                      size="s"
                      tuiSlot="top"
                    >
                      {{ unreadNotifications }}
                    </tui-badge-notification>
                  }
                  <button
                    tuiButton
                    type="button"
                    appearance="primary-grayscale"
                    size="m"
                    class="!rounded-full aspect-square md:aspect-auto md:!px-4 flex items-center justify-center"
                    iconStart="@tui.bell"
                    (click)="openNotifications()"
                    [attr.aria-label]="'notifications' | translate"
                  ></button>
                </tui-badged-content>
              }
            </div>
          }
        </main>
      </div>
    </tui-root>
  `,
})
export class AppComponent {
  protected global = inject(GlobalData);
  private router = inject(Router);
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

  // Signal derived from the current URL to decide whether to show the header
  protected currentUrl = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly dragPositionKey = 'mobile_buttons_position';
  protected readonly dragPosition = signal<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  protected dragging = false;
  private readonly supabase = inject(SupabaseService);

  protected showHeader = computed(() => {
    const url = this.currentUrl();
    const profile = this.global.userProfile();
    const hasSession = !!this.supabase.session();
    return (
      (profile || hasSession) &&
      url !== '/login' &&
      url !== '/signup' &&
      !url?.startsWith('/reset-password')
    );
  });

  private readonly langChange = toSignal(
    merge(
      this.translate.onLangChange.pipe(map(() => true)),
      this.translate.onDefaultLangChange.pipe(map(() => true)),
    ).pipe(startWith(true)),
  );

  constructor() {
    // Load saved position
    if (isPlatformBrowser(this.platformId)) {
      const savedPosition = this.storage.getItem(this.dragPositionKey);
      if (savedPosition) {
        try {
          this.dragPosition.set(JSON.parse(savedPosition));
        } catch (e) {
          console.error('Error parsing saved position', e);
        }
      }
    }

    effect(() => {
      this.currentUrl(); // Dependency on url change
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

  openChat() {
    if (this.dragging) return;
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  openNotifications() {
    if (this.dragging) return;
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  protected onDragStarted(): void {
    this.dragging = true;
  }

  protected onDragEnded(event: CdkDragEnd): void {
    const position = event.source.getFreeDragPosition();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Boundary margins and approximate button size
    const margin = 16;
    const buttonSize = 56;
    const totalHeight = buttonSize * 2 + 8; // Two buttons plus gap
    const navbarHeight = 64; // Approximate height of the bottom navbar

    // Snap to horizontal edges
    const snapX =
      position.x < -(windowWidth / 2 - buttonSize / 2)
        ? -(windowWidth - buttonSize - margin * 2)
        : 0;

    // Snap to vertical points (Top, Mid-High, Middle, Mid-Low, Bottom)
    const topLimit = -(windowHeight - totalHeight - margin * 2 - navbarHeight);
    const snapPointsY = [
      0, // Bottom
      topLimit * 0.25, // Mid-Low
      topLimit * 0.5, // Middle
      topLimit * 0.75, // Mid-High
      topLimit, // Top
    ];

    const snapY = snapPointsY.reduce((prev, curr) =>
      Math.abs(curr - position.y) < Math.abs(prev - position.y) ? curr : prev,
    );

    const snapped = { x: snapX, y: snapY };
    this.dragPosition.set(snapped);
    this.storage.setItem(this.dragPositionKey, JSON.stringify(snapped));

    // Reset dragging flag after a short delay to prevent click fire
    setTimeout(() => (this.dragging = false), 100);
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
