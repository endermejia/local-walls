import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiButton } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [TuiButton, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4 p-2">
      <p class="text-lg">{{ context.data.message }}</p>
      <button
        tuiButton
        type="button"
        size="m"
        appearance="primary"
        (click)="context.completeWith()"
      >
        {{ 'close' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorDialogComponent {
  readonly context =
    inject<TuiDialogContext<void, { message: string }>>(POLYMORPHEUS_CONTEXT);
}
