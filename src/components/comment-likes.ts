import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';

import { UserListDialogComponent } from '../dialogs/user-list-dialog';

@Component({
  selector: 'app-comment-likes',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TranslatePipe],
  template: `
    <div class="flex items-center gap-1">
      <button
        type="button"
        tuiIconButton
        size="s"
        appearance="transparent"
        [attr.aria-label]="'like' | translate"
        (click)="toggleLike($event)"
      >
        <tui-icon
          [icon]="userLiked() ? '@tui.heart-filled' : '@tui.heart'"
          [style.color]="userLiked() ? 'var(--tui-status-negative)' : ''"
        >
          ❤
        </tui-icon>
      </button>
      @if (likesCount() > 0) {
        <button
          tuiButton
          type="button"
          size="m"
          appearance="action-grayscale"
          class="!pr-1 !pl-1 !h-auto"
          (click)="showLikes($event)"
        >
          {{ likesCount() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentLikesComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  commentId = input.required<number>();
  likesCount = model.required<number>();
  userLiked = model.required<boolean>();

  protected async toggleLike(event: Event): Promise<void> {
    event.stopPropagation();
    const commentId = this.commentId();
    const success = await this.ascentsService.toggleCommentLike(commentId);
    if (success !== null) {
      const newLiked = success;
      const newCount = newLiked
        ? this.likesCount() + 1
        : Math.max(0, this.likesCount() - 1);

      this.userLiked.set(newLiked);
      this.likesCount.set(newCount);
    }
  }

  protected showLikes(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(UserListDialogComponent),
        {
          data: { commentId: this.commentId(), type: 'comment-likes' },
          label: this.translate.instant('likes'),
          size: 'm',
        },
      ),
      { defaultValue: false },
    );
  }
}
