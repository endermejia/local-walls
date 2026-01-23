import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

import { TranslateModule } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  standalone: true,
  selector: 'app-page-not-found',
  imports: [TuiBlockStatus, TuiButton, RouterLink, TranslateModule],
  template: `
    <div class="flex h-full items-center justify-center">
      <tui-block-status class="w-full max-w-5xl mx-auto p-4">
        <img
          alt="{{ 'notFound.imageAlt' | translate }}"
          [src]="global.iconSrc()('404')"
          tuiSlot="top"
        />

        <h4>{{ 'notFound.title' | translate }}</h4>

        <p class="description">{{ 'notFound.description' | translate }}</p>

        <a
          tuiButton
          type="button"
          appearance="primary"
          [routerLink]="['/home']"
          (click.zoneless)="$event.stopPropagation()"
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
