import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';

import { UserListDialogComponent } from '../dialogs/user-list-dialog';

@Component({
  selector: 'app-ascent-likes',
  standalone: true,
  imports: [TuiButton, TuiIcon, TranslatePipe],
  template: `
    @if (!isHidden()) {
      <div class="flex items-center gap-1">
        <button
          type="button"
          tuiIconButton
          size="m"
          appearance="transparent"
          [attr.aria-label]="'like' | translate"
          (click)="toggleLike($event)"
        >
          <tui-icon
            size="m"
            [icon]="item().user_liked ? '@tui.heart-filled' : '@tui.heart'"
            [style.color]="
              item().user_liked ? 'var(--tui-status-negative)' : ''
            "
          >
            ❤
          </tui-icon>
        </button>
        @if (item().likes_count) {
          <button
            tuiButton
            type="button"
            size="m"
            appearance="action-grayscale"
            class="!pr-1 !pl-1 !h-auto"
            (click)="showLikes($event)"
          >
            {{ item().likes_count }}
          </button>
        }
      </div>
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
