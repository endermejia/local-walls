import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TuiToast, TuiToastOptions } from '@taiga-ui/kit';
import { TuiPopover } from '@taiga-ui/cdk/services';
import { TranslatePipe } from '@ngx-translate/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

export interface UndoToastData {
  message: string;
  undoCallback: () => void;
}

@Component({
  standalone: true,
  selector: 'app-undo-toast',
  imports: [TuiButton, TuiToast, TranslatePipe],
  template: `
    <div tuiToast iconStart="@tui.info">
      <span class="truncate">{{
        context.data?.message || '' | translate
      }}</span>
      <button tuiButton size="s" type="button" (click)="onUndo()">
        {{ 'undo' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UndoToastComponent {
  protected readonly context =
    inject<TuiPopover<TuiToastOptions<UndoToastData>, boolean>>(
      POLYMORPHEUS_CONTEXT,
    );

  onUndo(): void {
    this.context.data?.undoCallback();
    this.context.completeWith(true);
  }
}
