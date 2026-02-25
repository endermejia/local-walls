import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiButton } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-first-steps-dialog',
  imports: [TuiButton, TranslatePipe, NgOptimizedImage],
  template: `
    <div class="flex flex-col items-center gap-6 text-center p-4">
      <img
        ngSrc="/logo/climbeast.svg"
        alt="Climbeast Logo"
        class="w-32 h-auto"
        height="93"
        width="128"
      />

      <div class="space-y-2 w-full">
        <h2 class="text-3xl font-bold">
          {{ 'firstSteps.welcomeTitle' | translate }}
        </h2>
        <p class="text-xl text-[var(--tui-text-secondary)]">
          {{ 'firstSteps.welcomeDescription' | translate }}
        </p>
      </div>

      <button
        tuiButton
        appearance="primary"
        size="l"
        class="w-full sm:w-auto"
        (click)="close()"
      >
        {{ 'firstSteps.startSetup' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstStepsDialogComponent {
  private readonly context = injectContext<TuiDialogContext<void>>();
  close(): void {
    this.context.completeWith();
  }
}
