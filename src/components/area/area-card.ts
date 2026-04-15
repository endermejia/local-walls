import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLink } from '@taiga-ui/core';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';
import { AppCardComponent } from '../ui/card';

import { AreaListItem } from '../../models';

@Component({
  selector: 'app-area-card',
  imports: [
    AppCardComponent,
    TuiLink,
    TranslatePipe,
    RouterLink,
    LowerCasePipe,
    ChartRoutesByGradeComponent,
  ],
  template: `
    @let item = area();
    <app-card [appearance]="appearance()" [liked]="item.liked">
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/area', item.slug]"
          class="font-bold! block text-2xl! text-(--tui-text-primary)! whitespace-normal!"
        >
          {{ item.name }}
        </a>
      </ng-container>

      <div content class="flex flex-col gap-1">
        @if (item.crags_count; as count) {
          <div class="text-xl">
            {{ count }}
            {{ (count === 1 ? 'crag' : 'crags') | translate | lowercase }}
          </div>
        }
      </div>

      <app-chart-routes-by-grade extra [grades]="item.grades" />
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaCardComponent {
  area = input.required<AreaListItem, Partial<AreaListItem>>({
    transform: (value) =>
      ({
        ...value,
        liked: value.liked ?? false,
        grades: value.grades ?? {},
      }) as AreaListItem,
  });
  appearance = input<string>('outline');
}
