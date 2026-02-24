import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services';

@Component({
  selector: 'app-ascent-comments',
  standalone: true,
  imports: [TuiButton, TuiIcon, TranslatePipe],
  template: `
    <div class="flex items-center gap-1">
      <tui-icon
        type="button"
        size="m"
        icon="@tui.message-circle"
        (click)="showComments($event)"
        [attr.aria-label]="'comments' | translate"
      />
      @if (commentsCountResource.value(); as count) {
        <button
          tuiButton
          type="button"
          size="m"
          appearance="action-grayscale"
          class="!pr-1 !pl-1 !h-auto"
          (click)="showComments($event)"
        >
          {{ count }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCommentsComponent {
  private readonly ascentsService = inject(AscentsService);

  ascentId = input.required<number>();

  protected readonly commentsCountResource = resource({
    params: () => this.ascentId(),
    loader: ({ params: id }) => this.ascentsService.getCommentsCount(id),
  });

  constructor() {
    this.ascentsService.ascentCommentsUpdate
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (id === this.ascentId()) {
          this.commentsCountResource.reload();
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
