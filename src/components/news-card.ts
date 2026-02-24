import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TuiAppearance, TuiButton, TuiLink } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { NewsItem } from '../models';
import { GlobalData } from '../services';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule, TuiAppearance, TuiAvatar, TuiButton, TuiHeader, TuiLink],
  template: `
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-4 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden"
    >
      <header tuiHeader class="!mt-0 flex justify-between items-center">
        <a [href]="item().link" target="_blank" class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user">
          <tui-avatar [src]="avatarUrl" size="s" />
          <div class="flex flex-col">
            <span class="font-bold text-sm group-hover/user:underline">
              Desnivel
            </span>
            <span class="text-xs">
              {{ item().date | date:'longDate' : undefined : global.selectedLanguage() }}
            </span>
          </div>
        </a>
        <a tuiButton size="s" appearance="secondary-grayscale" class="!rounded-full no-underline" [href]="item().link" target="_blank">
            Leer más
        </a>
      </header>

      @if (item().image; as img) {
         <a [href]="item().link" target="_blank" class="block -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-[var(--tui-background-neutral-1)] sm:rounded-2xl overflow-hidden relative flex items-center justify-center">
           <img [src]="img" class="w-full h-auto object-contain transition-transform duration-500 hover:scale-105" [alt]="item().title" />
         </a>
      }

      <div class="flex flex-col gap-1">
          <a [href]="item().link" target="_blank" class="font-bold text-lg leading-tight hover:underline cursor-pointer text-[var(--tui-text-primary)] no-underline" [innerHTML]="item().title"></a>
      </div>

      <div class="text-sm italic border-l-2 border-[var(--tui-border-normal)] pl-3 py-1 self-start text-[var(--tui-text-secondary)] line-clamp-3" [innerHTML]="item().excerpt"></div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
  protected readonly global = inject(GlobalData);
  item = input.required<NewsItem>();

  protected readonly avatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAM1BMVEVHcEwAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUow6nXSmAAAAEXRSTlMADd707LdpGUHI/0+VJ32sMXQpKsUAAADTSURBVHgBtdFXgsMgDEXRhxAIPer+Vzsmnp7wmevu4268q7A7mMSdpmwvsDiZaovU+kIr2YDuZD0hTCh2Qgxy3A/4AgvpQHaVFtBbGmX8YI9Ua2xZOLuma+H7jBtNqYPtvgTtWqy/6CxApjin2cAPLlKEpXpMq5La7BdmcjpF29o7ExnLDyayTLLgrirlcbn0dYF8Y+6PHRFhkBxlRM6A4NQ2PG40Oqaq7t/iOew9TRnTwtXkQgi2u+TOuu1FFe943XKpOFlUw6lBDUfs4mdEwDv7AJHCCVtPv7flAAAAAElFTkSuQmCC';
}
