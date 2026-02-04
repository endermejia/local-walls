import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import { TuiLoader } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService, FollowsService } from '../services';
import { AscentCardComponent } from './ascent-card';
import { EmptyStateComponent } from './empty-state';

@Component({
  selector: 'app-ascent-card-dialog',
  standalone: true,
  imports: [AscentCardComponent, EmptyStateComponent, TuiLoader],
  template: `
    <div class="p-4 -m-4">
      @if (ascent(); as data) {
        <app-ascent-card
          [data]="data"
          [isFollowed]="followedIdsSet().has(data.user_id)"
          (followEvent)="onFollow()"
          (unfollowEvent)="onUnfollow()"
        />
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
export class AscentCardDialogComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly followsService = inject(FollowsService);
  protected readonly context =
    injectContext<TuiDialogContext<void, { ascentId: number }>>();

  protected readonly ascentResource = resource({
    params: () => this.context.data?.ascentId,
    loader: ({ params: id }) => {
      if (!id) return Promise.resolve(null);
      return this.ascentsService.getAscentById(id);
    },
  });

  protected readonly followsResource = resource({
    loader: () => this.followsService.getFollowedIds(),
  });

  protected readonly ascent = computed(() => this.ascentResource.value());
  protected readonly loading = computed(() => this.ascentResource.isLoading());
  protected readonly followedIdsSet = computed(
    () => new Set(this.followsResource.value() ?? []),
  );

  protected onFollow() {
    void this.followsResource.reload();
  }

  protected onUnfollow() {
    void this.followsResource.reload();
  }
}
