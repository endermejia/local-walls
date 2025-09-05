import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { TuiButton } from '@taiga-ui/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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

        <button
          tuiButton
          type="button"
          appearance="primary"
          [routerLink]="['/home']"
          (click.zoneless)="$event.stopPropagation()"
        >
          {{ 'notFound.goHome' | translate }}
        </button>
      </tui-block-status>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-full',
  },
})
export class PageNotFoundComponent {
  // Keep reference to translate for potential programmatic usage and DI tree stability
  readonly global = inject(GlobalData);
}
