import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiLink, TuiIcon } from '@taiga-ui/core';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { AmountByEveryGrade } from '../../models';
import { TranslatePipe } from '@ngx-translate/core';
import { AppCardComponent } from '../ui/card';
import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';

export interface IndoorCenterCardItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country?: string | null;
  routes_count?: number;
  topos?: { id: string | number; name: string; slug: string }[] | null;
  grades?: AmountByEveryGrade | null;
}

@Component({
  selector: 'app-indoor-center-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    AppCardComponent,
    ChartRoutesByGradeComponent,
    TuiLink,
    TuiIcon,
  ],
  template: `
    @let data = item();
    <app-card appearance="outline">
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/indoor', data.slug]"
          class="font-bold! block text-2xl! text-(--tui-text-primary)! whitespace-normal!"
        >
          {{ data.name }}
        </a>
      </ng-container>

      <div content class="flex flex-col min-h-32 relative">
        <div class="flex items-center gap-1 opacity-60 text-xs mb-2">
          <span>
            {{ data.city }}{{ data.country ? ', ' + data.country : '' }}
          </span>
        </div>

        <div class="grow flex flex-col justify-center gap-2 pr-28">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              tuiLink
              class="flex items-center gap-2 cursor-pointer no-underline! text-inherit! opacity-90 hover:opacity-100 transition-opacity"
              [routerLink]="['/indoor', data.slug]"
            >
              <tui-icon icon="@tui.route" [style.font-size.rem]="1" />
              <span class="text-xs! sm:text-sm! whitespace-nowrap">
                {{ data.routes_count || 0 }} {{ 'routes' | translate }}
              </span>
            </a>

            @if (data.topos && data.topos.length > 0) {
              <a
                tuiLink
                appearance="action-grayscale"
                class="flex items-center gap-2 cursor-pointer no-underline! opacity-90 hover:opacity-100 transition-opacity"
                [routerLink]="['/indoor', data.slug]"
                [queryParams]="{ tab: 'topos' }"
              >
                <div
                  class="w-4 h-4 bg-current"
                  [style.mask]="'url(image/topo.svg) center/contain no-repeat'"
                ></div>
                <span class="text-xs! sm:text-sm! whitespace-nowrap">
                  {{ data.topos.length }} {{ 'topos' | translate }}
                </span>
              </a>
            }
          </div>
        </div>

        @if (data.grades) {
          <app-chart-routes-by-grade
            class="absolute bottom-4 right-4"
            [grades]="data.grades"
          />
        }
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorCenterCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);

  item = input.required<IndoorCenterCardItem>();
}
