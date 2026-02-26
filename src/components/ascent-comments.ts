import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';

@Component({
  selector: 'app-ascent-comments',
  standalone: true,
  imports: [TuiButton, TuiIcon, TranslatePipe],
  template: `
    @if (!isHidden()) {
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': 'isHidden() ? "none" : null',
  },
})
export class AscentCommentsComponent {
  private readonly ascentsService = inject(AscentsService);

  ascentId = input.required<number>();
  isPrivate = input(false);

  protected readonly isHidden = computed(() => {
    return this.isPrivate() && (this.commentsCountResource.value() || 0) === 0;
  });

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
