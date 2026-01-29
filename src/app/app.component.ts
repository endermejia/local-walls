import {
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { TuiButton, TuiRoot } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiBlockStatus } from '@taiga-ui/layout';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, merge, startWith } from 'rxjs';

import { GlobalData, LocalStorage } from '../services';

import { NavbarComponent } from '../components';
import { NgOptimizedImage } from '@angular/common';

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
  private dialogs = inject(TuiDialogService);
  private platformId = inject(PLATFORM_ID);

  private readonly gdprKey = 'lw_gdpr_accepted';
  protected gdprAccepted = signal(
    this.storage.getItem(this.gdprKey) === 'true',
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
