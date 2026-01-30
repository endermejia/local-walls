import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  TuiButton,
  TuiScrollbar,
  TuiTextfield,
  TuiLabel,
} from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { EmptyStateComponent } from './empty-state';

export interface AscentCommentsDialogData {
  ascentId: number;
}

@Component({
  selector: 'app-ascent-comments-dialog',
  standalone: true,
  imports: [
    EmptyStateComponent,
    TranslatePipe,
    TuiButton,
    TuiScrollbar,
    TuiTextfield,
    TuiLabel,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="flex flex-col gap-4 p-4">
          <!-- TODO: Load and display comments here -->
          <app-empty-state />
        </div>
      </tui-scrollbar>

      <div class="p-4 border-t border-[var(--tui-border-normal)]">
        <tui-textfield tuiTextfieldSize="m" class="w-full">
          <label tuiLabel for="new-comment">
            {{ 'labels.addComment' | translate }}
          </label>
          <input
            tuiTextfield
            id="new-comment"
            autocomplete="off"
            placeholder="..."
            disabled
          />
          <button
            tuiButton
            type="button"
            appearance="primary"
            size="s"
            iconStart="@tui.send"
            disabled
          >
            {{ 'actions.send' | translate }}
          </button>
        </tui-textfield>
        <p class="text-xs opacity-50 mt-2 italic">
          * {{ 'messages.commentsSoon' | translate }}
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCommentsDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentCommentsDialogData>>();

  protected readonly ascentId = this.context.data.ascentId;
}
