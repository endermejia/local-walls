import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

@Component({
  selector: 'app-card',
  imports: [TuiCardLarge, TuiHeader, TuiTitle, TuiIcon],
  template: `
    <div
      tuiCardLarge
      [appearance]="appearance()"
      class="w-full h-full flex flex-col"
    >
      <div class="flex flex-col min-w-0 grow">
        <header tuiHeader>
          <div class="flex items-center gap-2">
            <h2
              [tuiTitle]="titleSize()"
              class="font-bold! truncate"
              [class.text-3xl!]="titleSize() === 'l'"
            >
              <ng-content select="[title]" />
            </h2>
            @if (liked()) {
              <tui-icon
                icon="@tui.heart"
                [class.text-2xl]="titleSize() === 'l'"
                [style.color]="'var(--tui-background-accent-2)'"
              />
            }
          </div>
        </header>
        <section class="grid grid-cols-[1fr_auto] gap-2 items-stretch mt-auto">
          <div class="flex flex-col justify-between min-w-0">
            <ng-content select="[content]" />
          </div>
          <div class="flex items-center shrink-0">
            <ng-content select="[extra]" />
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCardComponent {
  appearance = input<string>('outline');
  titleSize = input<'m' | 'l'>('m');
  liked = input<boolean>(false);
}
