import { Component, computed, inject, resource } from '@angular/core';

import { TuiScrollbar } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService } from '../services/ascents.service';

import { AscentCardComponent } from '../components/ascent-card';
import { AscentCardSkeletonComponent } from '../components/ascent-card-skeleton';
import { EmptyStateComponent } from '../components/empty-state';

export interface AscentDialogData {
  ascentId: number;
}

@Component({
  selector: 'app-ascent-dialog',
  standalone: true,
  imports: [
    AscentCardComponent,
    AscentCardSkeletonComponent,
    EmptyStateComponent,
    TuiScrollbar,
  ],
  template: `
    <div class="flex flex-col max-h-[80dvh] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="p-4">
          @if (ascent(); as data) {
            <app-ascent-card [data]="data" />
          } @else if (loading()) {
            <app-ascent-card-skeleton />
          } @else {
            <div class="py-20">
              <app-empty-state />
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
})
export class AscentDialogComponent {
  private readonly ascentsService = inject(AscentsService);
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentDialogData>>();

  private readonly ascentId = this.context.data?.ascentId ?? 0;

  protected readonly ascentResource = resource({
    params: () => {
      const id = this.ascentId;
      return id > 0 ? id : null;
    },
    loader: ({ params: id }) => {
      if (!id) return Promise.resolve(null);
      return this.ascentsService.getAscentById(id);
    },
  });

  protected readonly ascent = computed(() => this.ascentResource.value());
  protected readonly loading = computed(() => this.ascentResource.isLoading());
}
