import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiDialogContext, TuiLoader } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
  imports: [TuiLoader],
  template: `
    <div class="flex flex-col items-center justify-center p-4 gap-4">
      <tui-loader size="xl"></tui-loader>
      <div class="tui-text_body-m">{{ context.data }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderDialogComponent {
  readonly context =
    inject<TuiDialogContext<void, string>>(POLYMORPHEUS_CONTEXT);
}
