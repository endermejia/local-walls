import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';

import { PaywallComponent } from './paywall';
import { TopoCardComponent } from '../topo/topo-card';
import { GlobalData } from '../../services/global-data';

@Component({
  selector: 'app-area-paywall-dialog',
  imports: [
    CommonModule,
    TuiScrollbar,
    PaywallComponent,
    TopoCardComponent,
    TranslatePipe,
  ],
  template: `
    <div
      class="flex flex-col gap-6 h-full min-h-0 bg-[var(--tui-background-base)] p-4 sm:p-6"
    >
      <div class="flex-none">
        <app-paywall
          [areaId]="context.data.areaId"
          [price]="context.data.price"
          [toposCount]="topos().length"
          [hideTitle]="true"
        />
      </div>

      <div class="flex flex-col gap-4 overflow-hidden h-full">
        <div class="flex items-center justify-between px-2">
          <h3 class="font-bold opacity-60 uppercase text-xs tracking-widest">
            {{ 'topos' | translate }} ({{ topos().length }})
          </h3>
          <div
            class="h-px grow ml-4 bg-[var(--tui-border-normal)] opacity-30"
          ></div>
        </div>

        <tui-scrollbar class="flex grow min-h-0">
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 p-2">
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
