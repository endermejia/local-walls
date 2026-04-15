import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiAvatar } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { SupabaseService } from '../../services/supabase.service';

import { CommentLikesComponent } from '../social/comment-likes';

import { MentionLinkPipe } from '../../pipes/mention-link.pipe';

@Component({
  selector: 'app-ascent-last-comment',
  standalone: true,
  imports: [
    CommonModule,
    TuiAvatar,
    TuiIcon,
    MentionLinkPipe,
    CommentLikesComponent,
  ],
  template: `
    @if (lastCommentResource.value(); as comment) {
      <div
        class="flex items-start gap-2 bg-(--tui-background-neutral-1) p-2 rounded-xl mt-1 animate-in fade-in slide-in-from-top-1 duration-300 cursor-pointer hover:bg-(--tui-background-neutral-1-hover) transition-colors"
        (click)="showComments($event)"
        (keydown.enter)="showComments($event)"
        (keydown.space)="showComments($event)"
        tabindex="0"
      >
        <div class="flex flex-col gap-1 grow min-w-0">
          <div class="flex items-center gap-2">
            <span tuiAvatar size="xs">
              @if (comment.user_profiles.avatar; as avatar) {
                <img [src]="supabase.buildAvatarUrl(avatar)" alt="" />
              } @else {
                <tui-icon icon="@tui.user" />
              }
            </span>
            <span class="text-[10px] font-bold opacity-70 truncate">
              {{ comment.user_profiles.name }}
            </span>
          </div>
          <p
            class="text-xs line-clamp-2 wrap-break-word pl-1 opacity-90"
            [innerHTML]="comment.comment | mentionLink"
          ></p>
        </div>

        <div class="flex flex-col items-center self-start">
          <app-comment-likes
            [commentId]="comment.id"
            [(likesCount)]="comment.likes_count"
            [(userLiked)]="comment.user_liked"
          />
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentLastCommentComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);

  ascentId = input.required<number>();

  protected readonly lastCommentResource = resource({
    params: () => this.ascentId(),
    loader: ({ params: id }) => this.ascentsService.getLastComment(id),
  });

  constructor() {
    this.ascentsService.ascentCommentsUpdate
      .pipe(takeUntilDestroyed())
      .subscribe((id: number) => {
        if (id === this.ascentId()) {
          this.lastCommentResource.reload();
        }
      });
  }

  protected showComments(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.ascentsService.openCommentsDialog(this.ascentId()),
      { defaultValue: undefined },
    );
  }
}
