import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiAppearance, TuiLink } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import { NewsItem } from '../models';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule, TuiAppearance, TuiHeader, TuiLink],
  template: `
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-4 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden"
    >
      <header tuiHeader class="!mt-0">
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider opacity-60">Desnivel</span>
            <span class="text-xs opacity-40">•</span>
            <span class="text-xs opacity-60">{{ item().date | date:'longDate' }}</span>
        </div>
        <a [href]="item().link" target="_blank" tuiLink class="font-bold text-xl leading-tight block hover:underline decoration-2 text-[var(--tui-text-primary)]" [innerHTML]="item().title"></a>
      </header>

      @if (item().image; as img) {
         <a [href]="item().link" target="_blank" class="block -mx-4 sm:-mx-4 aspect-video w-[calc(100%+2rem)] sm:w-[calc(100%+2rem)] overflow-hidden relative">
           <img [src]="img" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="" />
         </a>
      }

      <div class="text-[var(--tui-text-secondary)] line-clamp-3 text-sm" [innerHTML]="item().excerpt"></div>

      <div class="mt-2">
          <a [href]="item().link" target="_blank" tuiLink class="text-sm font-semibold">Leer más &rarr;</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
  item = input.required<NewsItem>();
}
