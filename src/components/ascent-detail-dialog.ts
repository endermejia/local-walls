import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import { TuiLoader } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService } from '../services';
import { AscentCardComponent } from './ascent-card';
import { EmptyStateComponent } from './empty-state';

@Component({
  selector: 'app-ascent-detail-dialog',
  standalone: true,
  imports: [AscentCardComponent, EmptyStateComponent, TuiLoader, CommonModule],
  template: `
    <div class="-m-4">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentDetailDialogComponent {
  private readonly ascentsService = inject(AscentsService);
  protected readonly context =
    injectContext<TuiDialogContext<void, { ascentId: number }>>();

  protected readonly ascentId = signal(this.context.data?.ascentId ?? 0);

  protected readonly ascentResource = resource({
    params: () => {
      const id = this.ascentId();
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
