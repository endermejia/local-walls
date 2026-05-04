import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import {
  ChangeDetectionStrategy,
  Component,
  SecurityContext,
  computed,
  inject,
  input,
} from '@angular/core';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { GlobalData } from '../../services/global-data';

import { NewsItem } from '../../models';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule, TuiAppearance, TuiAvatar, TuiButton, TuiHeader],
  template: `
    @let data = item();
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden"
    >
      <header tuiHeader class="mt-0! flex justify-between items-center">
        <a
          [href]="data.link"
          target="_blank"
          class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
        >
          <span [tuiAvatar]="avatarUrl" size="s"></span>
          <div class="flex flex-col">
            <span class="font-bold text-sm group-hover/user:underline">
              Desnivel
            </span>
            <span class="text-xs">
              {{
                data.date
                  | date: 'longDate' : undefined : global.selectedLanguage()
              }}
            </span>
          </div>
        </a>
        <a
          tuiButton
          size="s"
          appearance="secondary-grayscale"
          class="rounded-full! no-underline"
          [href]="data.link"
          target="_blank"
        >
          Leer más
        </a>
      </header>

      @if (data.image; as img) {
        <a
          [href]="data.link"
          target="_blank"
          class="-mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-(--tui-background-neutral-1) sm:rounded-2xl overflow-hidden relative flex items-center justify-center aspect-video"
        >
          <img
            [src]="img"
            class="w-full h-auto object-contain transition-transform duration-500 hover:scale-105"
            [alt]="data.title"
            loading="lazy"
          />
        </a>
      }

      <div class="flex flex-col gap-1">
        <a
          [href]="data.link"
          target="_blank"
          class="font-bold text-lg leading-tight hover:underline cursor-pointer text-(--tui-text-primary) no-underline"
          [innerHTML]="sanitizedTitle()"
        ></a>
      </div>

      <div
        class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start text-(--tui-text-secondary) line-clamp-3"
        [innerHTML]="sanitizedExcerpt()"
      ></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
  protected readonly global = inject(GlobalData);
  private readonly sanitizer = inject(DomSanitizer);
  item = input.required<NewsItem>();

  sanitizedTitle = computed(
    () =>
      this.sanitizer.sanitize(SecurityContext.HTML, this.item().title) || '',
  );
  sanitizedExcerpt = computed(
    () =>
      this.sanitizer.sanitize(SecurityContext.HTML, this.item().excerpt) || '',
  );

  protected readonly avatarUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAM1BMVEVHcEwAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUow6nXSmAAAAEXRSTlMADd707LdpGUHI/0+VJ32sMXQpKsUAAADTSURBVHgBtdFXgsMgDEXRhxAIPer+Vzsmnp7wmevu4268q7A7mMSdpmwvsDiZaovU+kIr2YDuZD0hTCh2Qgxy3A/4AgvpQHaVFtBbGmX8YI9Ua2xZOLuma+H7jBtNqYPtvgTtWqy/6CxApjin2cAPLlKEpXpMq5La7BdmcjpF29o7ExnLDyayTLLgrirlcbn0dYF8Y+6PHRFhkBxlRM6A4NQ2PG40Oqaq7t/iOew9TRnTwtXkQgi2u+TOuu1FFe943XKpOFlUw6lBDUfs4mdEwDv7AJHCCVtPv7flAAAAAElFTkSuQmCC';
}
