import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiItem } from '@taiga-ui/cdk';
import { TuiLink } from '@taiga-ui/core';
import { TuiBreadcrumbs } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TuiBreadcrumbs, TuiItem, TuiLink],
  template: `
    @let breadcrumbs = global.breadcrumbs();
    @if (breadcrumbs.length > 0) {
      <tui-breadcrumbs size="l" class="mb-1" ngSkipHydration>
        @for (item of breadcrumbs; track item.caption) {
          <a
            *tuiItem
            tuiLink
            [routerLink]="item.routerLink"
            class="text-xs opacity-60"
          >
            {{ item.caption | translate }}
          </a>
        }
      </tui-breadcrumbs>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  protected readonly global = inject(GlobalData);
}
