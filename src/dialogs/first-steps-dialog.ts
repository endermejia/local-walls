import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiButton, TuiDialogContext, TuiTitle } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-first-steps-dialog',
  imports: [TuiButton, TuiTitle, TranslatePipe],
  template: `
    <div class="flex flex-col items-center gap-6 text-center p-4">
      <img src="/logo.svg" alt="Climbeast Logo" class="w-32 h-32" />

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

  close(): void {
    this.context.completeWith();
  }
}
