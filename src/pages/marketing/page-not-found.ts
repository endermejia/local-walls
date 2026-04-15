import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiBlockStatus } from '@taiga-ui/layout';
import { TuiButton } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';

import { IconSrcPipe } from '../../pipes/icon-src.pipe';

@Component({
  selector: 'app-page-not-found',
  imports: [
    IconSrcPipe,
    RouterLink,
    TranslateModule,
    TuiBlockStatus,
    TuiButton,
  ],
  template: `
    <div class="flex h-full items-center justify-center">
      <tui-block-status class="w-full max-w-5xl mx-auto p-4">
        <img
          alt="{{ 'notFound.imageAlt' | translate }}"
          [src]="'404' | iconSrc"
          tuiSlot="top"
        />

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
export class PageNotFoundComponent {}
