import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';

import { UserListDialogComponent } from '../dialogs/user-list-dialog';
import { LikesComponent } from './likes';

@Component({
  selector: 'app-ascent-likes',
  standalone: true,
  imports: [LikesComponent],
  template: `
    @if (!isHidden()) {
      <app-likes
        [userLiked]="item().user_liked"
        [likesCount]="item().likes_count"
        (toggleLike)="toggleLike($event)"
        (showLikes)="showLikes($event)"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': 'isHidden() ? "none" : null',
  },
})
export class AscentLikesComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  ascentId = input.required<number>();
  isPrivate = input(false);

  protected readonly isHidden = computed(() => {
    return this.isPrivate() && this.item().likes_count === 0;
  });

  private readonly likesResource = resource({
    params: () => this.ascentId(),
    loader: async ({ params: id }) => this.ascentsService.getLikesInfo(id),
  });

  protected item = computed(() => {
    return (
      this.likesResource.value() ?? {
        likes_count: 0,
        user_liked: false,
      }
    );
  });

  protected async toggleLike(event: Event): Promise<void> {
    event.stopPropagation();
    const id = this.ascentId();
    const success = await this.ascentsService.toggleLike(id);
    if (success !== null) {
      this.likesResource.update((current) => {
        if (!current) return current;
        const newLiked = success;
        const newCount = newLiked
          ? current.likes_count + 1
          : Math.max(0, current.likes_count - 1);
        return {
          ...current,
          user_liked: newLiked,
          likes_count: newCount,
        };
      });

      // Notificar a otros componentes que puedan estar mostrando el mismo ascent
      this.ascentsService.refreshResources(id, {
        user_liked: success,
        likes_count: this.item().likes_count,
      });
    }
  }

  protected showLikes(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(UserListDialogComponent),
        {
          data: { ascentId: this.ascentId(), type: 'ascent-likes' },
          label: this.translate.instant('likes'),
          size: 'm',
        },
      ),
      { defaultValue: false },
    );
  }
}
