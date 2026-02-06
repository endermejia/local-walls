import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-tour-hint',
  standalone: true,
  imports: [TuiButton, TuiIcon, TranslatePipe],
  template: `
    <div
      class="flex flex-col gap-4 p-4 max-w-xs bg-[var(--tui-background-base)] rounded-xl shadow-lg border border-[var(--tui-border-normal)]"
    >
      <div class="flex items-start gap-3">
        <tui-icon
          icon="@tui.info"
          class="mt-1 text-[var(--tui-text-tertiary)]"
        />
        <p class="text-[var(--tui-text-primary)] m-0 text-sm leading-relaxed">
          {{ description() }}
        </p>
      </div>
      <div class="flex justify-end">
        <button
          tuiButton
          size="s"
          appearance="primary"
          (click)="onNext()"
        >
          {{ (isLast() ? 'tour.finish' : 'tour.next') | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourHintComponent {
  readonly description = input.required<string>();
  readonly isLast = input<boolean>(false);
  readonly next = output<void>();

  onNext(): void {
    this.next.emit();
  }
}
