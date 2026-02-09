import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TuiAvatar } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';

import { AscentsService, SupabaseService } from '../services';

@Component({
  selector: 'app-ascent-last-comment',
  standalone: true,
  imports: [CommonModule, TuiAvatar],
  template: `
    @if (lastCommentResource.value(); as comment) {
      <div
        class="flex flex-col gap-1 bg-[var(--tui-background-neutral-1)] p-2 rounded-xl mt-1 animate-in fade-in slide-in-from-top-1 duration-300 cursor-pointer hover:bg-[var(--tui-background-neutral-1-hover)] transition-colors"
        (click)="showComments($event)"
      >
        <div class="flex items-center gap-2">
          <tui-avatar
            [src]="
              supabase.buildAvatarUrl(comment.user_profiles.avatar) ||
              '@tui.user'
            "
            size="xs"
          />
          <span class="text-[10px] font-bold opacity-70">
            {{ comment.user_profiles.name }}
          </span>
        </div>
        <p class="text-xs line-clamp-2 break-words pl-1 opacity-90">
          {{ comment.comment }}
        </p>
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
      .subscribe((id) => {
        if (id === this.ascentId()) {
          this.lastCommentResource.reload();
        }
      });
  }

  protected showComments(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.ascentsService.openCommentsDialog(this.ascentId()),
    );
  }
}
