import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

import { TranslateModule } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-page-not-found',
  imports: [TuiBlockStatus, TuiButton, RouterLink, TranslateModule],
  template: `
    <div class="flex h-full items-center justify-center">
      <tui-block-status class="w-full max-w-5xl mx-auto p-4">
        <div
          class="w-full h-64 bg-current opacity-80"
          tuiSlot="top"
          role="img"
          [attr.aria-label]="'notFound.imageAlt' | translate"
          [style.mask-image]="'url(' + global.iconSrc()('404') + ')'"
          [style.mask-size]="'contain'"
          [style.mask-position]="'center'"
          [style.mask-repeat]="'no-repeat'"
          [style.-webkit-mask-image]="'url(' + global.iconSrc()('404') + ')'"
          [style.-webkit-mask-size]="'contain'"
          [style.-webkit-mask-position]="'center'"
          [style.-webkit-mask-repeat]="'no-repeat'"
        ></div>

        <h4>{{ 'notFound.title' | translate }}</h4>

        <p class="description">{{ 'notFound.description' | translate }}</p>

        <a
          tuiButton
          type="button"
          appearance="primary"
          [routerLink]="['/home']"
        >
          {{ 'notFound.goHome' | translate }}
        </a>
      </tui-block-status>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-full',
  },
})
export class PageNotFoundComponent {
  readonly global = inject(GlobalData);
}
