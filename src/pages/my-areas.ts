import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-my-areas',
  standalone: true,
  imports: [TuiIcon, TuiHeader, TuiTitle, TranslatePipe],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'nav.my-crags' | translate }}</h1>
      </header>

      <div class="flex flex-col items-center justify-center py-20 opacity-50">
        <tui-icon icon="@tui.list" size="xl" class="mb-4" />
        <p>{{ 'labels.empty' | translate }}</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAreasComponent {}

export default MyAreasComponent;
