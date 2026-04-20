import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-landing',
  imports: [
    NgOptimizedImage,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
  ],
  template: `
    <div
      class="min-h-screen flex flex-col items-center justify-center p-6 bg-(--tui-background-base) text-center"
    >
      <div class="mb-8 relative w-[150px] h-[109px]">
        <img
          ngSrc="/logo/climbeast.svg"
          alt="ClimBeast Logo"
          fill
          class="object-contain"
          priority
        />
      </div>

      <header class="text-center mb-8">
        <h1
          class="text-4xl sm:text-5xl font-black tracking-tight text-balance leading-tight flex flex-col items-center"
        >
          <span class="leading-none">{{ 'climbeast.title' | translate }}</span>
          <span
            class="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-(--tui-text-tertiary) mt-2"
          >
            {{ 'climbeast.subtitle' | translate }}
          </span>
        </h1>
      </header>

      <p class="text-(--tui-text-02) text-lg max-w-md mb-12">
        {{ 'landing.description' | translate }}
      </p>

      <div class="flex flex-col gap-4 w-full max-w-xs">
        <a
          routerLink="/login"
          tuiButton
          size="l"
          appearance="primary"
          class="w-full"
        >
          {{ 'auth.login' | translate }}
        </a>
        <a
          routerLink="/login"
          [queryParams]="{ register: 'true' }"
          tuiButton
          size="l"
          appearance="outline"
          class="w-full"
        >
          {{ 'auth.register' | translate }}
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    this.seo.setPage({
      title: this.translate.instant('seo.title'),
      description:
        this.translate.instant('landing.description') ||
        this.translate.instant('seo.description'),
      canonicalUrl: 'https://climbeast.com/info',
    });
  }
}
