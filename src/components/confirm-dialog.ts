import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TuiButton, TranslatePipe],
  template: `
    <div class="grid gap-4">
      <p class="whitespace-pre-line">{{ ctx.data.message }}</p>

      <div class="flex justify-end gap-2">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="ctx.$implicit.complete()"
        >
          {{ ctx.data.cancelLabel || 'common.cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary-destructive"
          type="button"
          (click.zoneless)="ctx.completeWith(true)"
        >
          {{ ctx.data.confirmLabel || 'common.delete' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly ctx = injectContext<
    TuiDialogContext<
      boolean,
      {
        title?: string;
        message?: string;
        confirmLabel?: string;
        cancelLabel?: string;
      }
    >
  >();
}

export default ConfirmDialogComponent;
