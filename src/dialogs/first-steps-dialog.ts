import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiButton, TuiDialogContext, TuiTitle } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { TourService } from '../services/tour.service';

@Component({
  selector: 'app-first-steps-dialog',
  imports: [TuiButton, TuiTitle, TranslatePipe, NgOptimizedImage],
  template: `
    <div class="flex flex-col items-center gap-6 text-center p-4">
      <img
        ngSrc="/logo/climbeast.svg"
        alt="Climbeast Logo"
        class="w-32 h-auto"
        height="93"
        width="128"
      />

      <div class="space-y-2">
        <h2 tuiTitle class="text-2xl font-bold">
          {{ 'firstSteps.welcomeTitle' | translate }}
        </h2>
        <p class="text-lg text-[var(--tui-text-secondary)]">
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
  private readonly tourService = inject(TourService);

  close(): void {
    void this.tourService.start();
    this.context.completeWith();
  }
}
