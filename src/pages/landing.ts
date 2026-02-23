import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAppearance, TuiButton, TuiTitle } from '@taiga-ui/core';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiTitle,
    NgOptimizedImage,
  ],
  template: `
    <div
      class="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--tui-background-base)] text-center"
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

      <h1 tuiTitle class="!mb-4 !text-3xl font-bold">
        {{ 'landing.welcome' | translate }}
      </h1>

      <p class="text-[var(--tui-text-02)] text-lg max-w-md mb-12">
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
export class LandingComponent {}
