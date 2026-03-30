import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-likes',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TranslatePipe],
  template: `
    <div class="flex items-center gap-1">
      <tui-icon
        type="button"
        [style.width.rem]="size() === 's' ? 1.2 : 1.5"
        [style.height.rem]="size() === 's' ? 1.2 : 1.5"
        [icon]="userLiked() ? '@tui.heart-filled' : '@tui.heart'"
        [style.color]="userLiked() ? 'var(--tui-status-negative)' : ''"
        (click)="onToggle($event)"
        [attr.aria-label]="'like' | translate"
        class="cursor-pointer"
      />
      @if (likesCount() > 0) {
        <button
          tuiButton
          type="button"
          [size]="size()"
          appearance="action-grayscale"
          class="!pr-1 !pl-1 !h-auto"
          (click)="onShowLikes($event)"
        >
          {{ likesCount() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LikesComponent {
  userLiked = input.required<boolean>();
  likesCount = input.required<number>();
  size = input<'s' | 'm'>('m');

  toggleLike = output<Event>();
  showLikes = output<Event>();

  protected onToggle(event: Event): void {
    event.stopPropagation();
    this.toggleLike.emit(event);
  }

  protected onShowLikes(event: Event): void {
    event.stopPropagation();
    this.showLikes.emit(event);
  }
}
