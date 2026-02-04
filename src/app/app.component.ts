import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { TuiAppearance, TuiButton, TuiRoot } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, map, merge, startWith } from 'rxjs';

import { GlobalData, LocalStorage } from '../services';

import { NavbarComponent } from '../components';
import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../dialogs/notifications-dialog';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    NgOptimizedImage,
    RouterOutlet,
    TranslateModule,
    TuiBlockStatus,
    TuiButton,
    TuiRoot,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiAppearance,
  ],
  template: `
    <tui-root class="overflow-hidden" [attr.tuiTheme]="global.selectedTheme()">
      @if (gdprAccepted()) {
        <div class="h-[100dvh] flex flex-col-reverse md:flex-row">
          @if (showHeader()) {
            <app-navbar />
          }
          <div class="flex-1 overflow-hidden relative flex flex-col">
            <router-outlet />

            @if (showHeader()) {
              <div
                class="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-50"
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
                  >
                    <span class="hidden md:block">{{
                      'labels.messages' | translate
                    }}</span>
                  </button>
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
                    >
                      <span class="hidden md:block">{{
                        'labels.notifications' | translate
                      }}</span>
                    </button>
                  </tui-badged-content>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="h-[100dvh] flex items-center justify-center p-4">
          <tui-block-status class="w-full max-w-lg mx-auto p-4">
            <img
              [ngSrc]="global.iconSrc()('topo')"
              alt="{{ 'labels.gdpr.title' | translate }}"
              tuiSlot="top"
              height="100"
              width="100"
            />
            <h4>{{ 'labels.gdpr.title' | translate }}</h4>
            <p
              class="description"
              [innerHTML]="
                (showFullPrivacy()
                  ? 'labels.gdpr.fullPolicy'
                  : 'labels.gdpr.message'
                ) | translate
              "
            ></p>
            <div class="flex flex-col gap-2 w-full mt-6">
              @if (showFullPrivacy()) {
                <button
                  tuiButton
                  type="button"
                  appearance="primary"
                  (click)="acceptGdpr()"
                >
                  {{ 'labels.gdpr.accept' | translate }}
                </button>
              } @else {
                <button
                  tuiButton
                  type="button"
                  appearance="primary"
                  (click)="showFullPrivacy.set(true)"
                >
                  {{ 'labels.gdpr.readMore' | translate }}
                </button>
              }
            </div>
          </tui-block-status>
        </div>
      }
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

  private readonly gdprKey = 'lw_gdpr_accepted';
  protected gdprAccepted = signal(
    this.storage.getItem(this.gdprKey) !== 'false',
  );
  protected showFullPrivacy = signal(false);

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
      if (this.langChange()) {
        this.updateSeoTags();
      }
    });
  }

  protected acceptGdpr(): void {
    this.storage.setItem(this.gdprKey, 'true');
    this.gdprAccepted.set(true);
  }

  openChat() {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('labels.messages'),
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
          label: this.translate.instant('labels.notifications'),
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
