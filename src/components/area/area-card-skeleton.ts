import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-area-card-skeleton',
  standalone: true,
  imports: [TuiCardLarge, TuiHeader, TuiSkeleton],
  template: `
    <div
      tuiCardLarge
      appearance="outline"
      class="w-full h-full flex flex-col gap-0!"
    >
      <header tuiHeader>
        <h2 class="font-bold! whitespace-normal! min-w-0">
          <div [tuiSkeleton]="true" class="w-32 h-6 rounded-full"></div>
        </h2>
      </header>

      <section class="grow flex flex-col justify-center py-2">
        <div class="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div class="flex flex-col justify-center min-w-0">
            <div [tuiSkeleton]="true" class="w-24 h-4 rounded-full mb-2"></div>
          </div>
          <div class="flex items-center shrink-0">
            <div [tuiSkeleton]="true" class="w-24 h-24 rounded-full"></div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AreaCardSkeletonComponent {}
