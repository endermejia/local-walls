import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import { TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService } from '../services';
import { AscentCardComponent } from './ascent-card';
import { EmptyStateComponent } from './empty-state';

@Component({
  selector: 'app-ascent-detail-dialog',
  standalone: true,
  imports: [
    AscentCardComponent,
    EmptyStateComponent,
    TuiLoader,
    TuiScrollbar,
    CommonModule,
  ],
  template: `
    <div class="flex flex-col h-[70dvh] min-h-[400px] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="p-4">
          @if (ascent(); as data) {
            <app-ascent-card [data]="data" />
          } @else if (loading()) {
            <div class="py-20 flex justify-center">
              <tui-loader />
            </div>
          } @else {
            <div class="py-20">
              <app-empty-state />
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentDetailDialogComponent {
  private readonly ascentsService = inject(AscentsService);
  protected readonly context = injectContext<TuiDialogContext<void, number>>();

  protected readonly ascentResource = resource({
    params: () => this.context.data,
    loader: ({ params: id }) => this.ascentsService.getAscentById(id),
  });

  protected readonly ascent = computed(() => this.ascentResource.value());
  protected readonly loading = computed(() => this.ascentResource.isLoading());
}

export default AscentDetailDialogComponent;
