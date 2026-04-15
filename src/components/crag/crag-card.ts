import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';
import { AppCardComponent } from '../ui/card';

@Component({
  selector: 'app-crag-card',
  standalone: true,
  imports: [
    AppCardComponent,
    TuiButton,
    TuiIcon,
    TuiLink,
    TranslatePipe,
    RouterLink,
    TuiBadge,
    ChartRoutesByGradeComponent,
  ],
  template: `
    <app-card [appearance]="appearance()" [liked]="crag().liked">
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/area', crag().area_slug, crag().slug]"
          class="font-bold! no-underline! truncate block text-2xl! text-(--tui-text-primary)!"
        >
          {{ crag().name }}
        </a>
      </ng-container>
      <div content class="flex flex-col min-h-32">
        @let routesCount = crag().routes_count || 0;
        @let topoCount =
          crag().topos?.length ||
          (crag().crag_topos_counts || [])[0]?.count ||
          0;

        <!-- Area name at the very top of content -->
        @if (showAreaName()) {
          <a
            tuiLink
            appearance="action-grayscale"
            [routerLink]="['/area', crag().area_slug]"
            class="text-xs! opacity-60 mb-1 w-fit"
          >
            {{ crag().area_name }}
          </a>
        }

        <!-- Information strictly centered -->
        <div class="grow flex flex-col justify-center gap-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            @if (topoCount > 0) {
              <div
                appearance="neutral"
                size="s"
                tuiBadge
                class="flex items-center gap-1"
              >
                <tui-icon icon="@tui.images" />
                <span> {{ topoCount }} {{ 'topos' | translate }} </span>
              </div>
            }
            <div class="flex items-center gap-2">
              <tui-icon
                icon="@tui.route"
                class="opacity-60"
                [style.font-size.rem]="1"
              />
              <span class="text-xs! sm:text-sm! whitespace-nowrap">
                {{ routesCount }} {{ 'routes' | translate }}
              </span>
            </div>
            @if (crag().approach; as appr) {
              <div class="flex items-center gap-1 opacity-60">
                <tui-icon icon="@tui.footprints" [style.font-size.rem]="1" />
                <span class="text-xs! sm:text-sm! whitespace-nowrap">
                  {{ appr }} min.
                </span>
              </div>
            }
          </div>

          <!-- Topo badges -->
          @if (crag().topos?.length) {
            <div class="flex flex-wrap gap-2 pt-1">
              @for (topo of crag().topos; track topo.id) {
                <button
                  tuiButton
                  size="s"
                  appearance="primary-grayscale"
                  class="rounded-full! text-xs!"
                  [routerLink]="[
                    '/area',
                    crag().area_slug,
                    crag().slug,
                    'topo',
                    topo.id,
                  ]"
                >
                  {{ topo.name }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Chart at the right side (extra slot) centered vertically of the content area -->
      @if (crag().grades) {
        <app-chart-routes-by-grade extra [grades]="crag().grades!" />
      }
    </app-card>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragCardComponent {
  crag = input.required<any>();
  appearance = input<string>('outline');
  showAreaName = input<boolean>(true);
}
