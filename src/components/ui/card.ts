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
      class="w-full h-full flex flex-col gap-0!"
    >
      <header tuiHeader>
        <h2 tuiTitle class="font-bold! whitespace-normal! min-w-0">
          <ng-content select="[title]" />
        </h2>

        <aside tuiAccessories>
          <ng-content select="[titleActions]" />
          @if (liked()) {
            <tui-icon
              icon="@tui.heart"
              class="shrink-0"
              style="font-size: 1.5rem; color: var(--tui-background-accent-2)"
            />
          }
        </aside>

        <div tuiSubtitle class="truncate">
          <ng-content select="[subtitle]" />
        </div>
      </header>

      <section class="grow flex flex-col justify-center py-2">
        <div class="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div class="flex flex-col justify-center min-w-0">
            <ng-content select="[content]" />
          </div>
          <div class="flex items-center shrink-0">
            <ng-content select="[extra]" />
          </div>
        </div>
      </section>

      @if (hasFooter()) {
        <footer class="pt-2">
          <ng-content select="[footer]" />
        </footer>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AppCardComponent {
  appearance = input<string>('outline');
  liked = input<boolean>(false);
  hasFooter = input<boolean>(false);
}
