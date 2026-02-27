import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { SeoService } from '../services/seo.service';

import { TuiAppearance, TuiButton, TuiRoot } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, map, merge, startWith } from 'rxjs';

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
              class="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-50 md:hidden"
            >
              <tui-badged-content [style.--tui-radius.%]="50">
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
                  appearance="secondary-grayscale"
                  size="m"
                  class="!rounded-full aspect-square md:aspect-auto md:!px-4 flex items-center justify-center !bg-[var(--tui-background-base)] hover:!bg-[var(--tui-background-base-alt)] shadow-md"
                  iconStart="@tui.messages-square"
                  (click)="openChat()"
                  [attr.aria-label]="'messages' | translate"
                ></button>
              </tui-badged-content>

              @if (!global.userProfile()?.private) {
                <tui-badged-content [style.--tui-radius.%]="50">
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
                    appearance="secondary-grayscale"
                    size="m"
                    class="!rounded-full aspect-square md:aspect-auto md:!px-4 flex items-center justify-center !bg-[var(--tui-background-base)] hover:!bg-[var(--tui-background-base-alt)] shadow-md"
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

  private readonly gdprKey = 'lw_gdpr_accepted';

  // Signal derived from the current URL to decide whether to show the header
  protected currentUrl = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected showHeader = computed(() => {
    const url = this.currentUrl();
    const profile = this.global.userProfile();
    return (
      profile &&
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
  }

  openChat() {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  openNotifications() {
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
