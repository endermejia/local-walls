import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiButton, TuiIcon, TuiScrollbar, TuiTitle } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-order-failed',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div
        class="max-w-2xl mx-auto w-full py-20 px-4 text-center flex flex-col items-center gap-6"
      >
        <div
          class="w-24 h-24 bg-(--tui-background-negative-neutral) text-(--tui-status-negative) rounded-full flex items-center justify-center mb-4"
        >
          <tui-icon icon="@tui.x" class="text-5xl"></tui-icon>
        </div>

        <h1 tuiTitle="l" class="text-4xl font-black">
          {{ 'merchandising.failed.title' | translate }}
        </h1>

        <p class="text-(--tui-text-secondary) max-w-md mx-auto">
          {{ 'merchandising.failed.description' | translate }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
          <button
            tuiButton
            appearance="primary"
            size="l"
            routerLink="/merchandising/checkout"
          >
            {{ 'merchandising.failed.tryAgain' | translate }}
          </button>
          <button
            tuiButton
            appearance="flat"
            size="l"
            routerLink="/merchandising"
          >
            {{ 'merchandising.success.continueShopping' | translate }}
          </button>
        </div>
      </div>
    </tui-scrollbar>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderFailedComponent {}
