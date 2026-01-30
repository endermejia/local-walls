import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import { AscentCommentsDialogComponent } from './ascent-comments-dialog';

@Component({
  selector: 'app-ascent-comments',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    <div class="flex items-center gap-1">
      <tui-icon
        type="button"
        size="m"
        icon="@tui.message-circle"
        (click)="showComments($event)"
      />
      <button
        tuiButton
        type="button"
        size="m"
        appearance="action-grayscale"
        class="!pr-1 !pl-1 !h-auto"
        (click)="showComments($event)"
      >
        0
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCommentsComponent {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  ascentId = input.required<number>();

  protected showComments(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.dialogs.open<void>(
        new PolymorpheusComponent(AscentCommentsDialogComponent),
        {
          data: { ascentId: this.ascentId() },
          label: this.translate.instant('labels.comments'),
          size: 'm',
        },
      ),
    );
  }
}
