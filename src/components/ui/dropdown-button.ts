import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  TemplateRef,
} from '@angular/core';

import { TuiChevron } from '@taiga-ui/kit';
import { TuiDropdown, TuiLink } from '@taiga-ui/core';

@Component({
  selector: 'app-dropdown-button',
  imports: [TuiChevron, TuiDropdown, TuiLink],
  template: `
    <button
      tuiLink
      tuiChevron
      [appearance]="appearance()"
      type="button"
      class="font-bold! text-inherit! no-underline! bg-transparent! inline-flex items-center"
      [class.text-xl!]="size() === 'xl'"
      [class.text-2xl!]="size() === '2xl'"
      [tuiDropdown]="content()"
      [(tuiDropdownOpen)]="open"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownButtonComponent {
  appearance = input<string>('flat');
  size = input<'xl' | '2xl'>('xl');
  content = input.required<TemplateRef<Record<string, unknown>> | null>();

  open = model(false);
}
