import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';

import { PaywallComponent } from './paywall/paywall.component';
import { TopoCardComponent } from './topo-card';
import { GlobalData } from '../services/global-data';

@Component({
  selector: 'app-area-paywall-dialog',
  imports: [CommonModule, TuiScrollbar, PaywallComponent, TopoCardComponent],
  template: `
    <div
      class="flex flex-col gap-6 h-full min-h-0 bg-[var(--tui-background-base)]"
    >
      <div class="px-2">
        <app-paywall
          [areaId]="context.data.areaId"
          [price]="context.data.price"
          [toposCount]="topos().length"
        />
      </div>

      <div class="flex flex-col gap-4 overflow-hidden h-full">
        <tui-scrollbar class="flex grow min-h-0">
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 p-2 pt-0">
            @for (t of topos(); track t.id) {
              <app-topo-card [topo]="t" />
            }
          </div>
        </tui-scrollbar>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaPaywallDialogComponent {
  protected readonly context =
    inject<TuiDialogContext<void, { areaId: number; price: number }>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly global = inject(GlobalData);
  protected readonly topos = computed(
    () => this.global.areaToposResource.value() || [],
  );
}
