import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  imports: [TuiIcon, TranslatePipe],
  template: `
    <div
      class="flex flex-col items-center justify-center gap-4 opacity-50 py-10"
    >
      <tui-icon [icon]="icon()" class="text-6xl" />
      <p class="text-xl font-medium">{{ message() | translate }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  message = input<string>('empty');
  icon = input<string>('@tui.package-open');
}
