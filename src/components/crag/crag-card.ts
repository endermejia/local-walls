import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';
import { AppCardComponent } from '../ui/card';

import { CragListItem } from '../../models';

@Component({
  selector: 'app-crag-card',
  standalone: true,
  imports: [
    AppCardComponent,
    ChartRoutesByGradeComponent,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiLink,
  ],
  template: `
    @let item = crag();
    <app-card [appearance]="appearance()" [liked]="item.liked">
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/area', item.area_slug, item.slug]"
          class="font-bold! block text-2xl! text-(--tui-text-primary)! whitespace-normal!"
        >
          {{ item.name }}
        </a>
      </ng-container>
      <div content class="flex flex-col min-h-32">
        @let routesCount = item.routes_count || 0;
        @let topoCount = item.topos.length;

        <!-- Area name at the very top of content -->
        @if (showAreaName()) {
          <a
            tuiLink
            appearance="action-grayscale"
            [routerLink]="['/area', item.area_slug]"
            class="text-xs! opacity-60 mb-1 w-fit"
          >
            {{ item.area_name }}
          </a>
        }

        <!-- Information strictly centered -->
        <div class="grow flex flex-col justify-center gap-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              tuiLink
              class="flex items-center gap-2 cursor-pointer no-underline! text-inherit! opacity-90 hover:opacity-100 transition-opacity"
              [routerLink]="['/area', item.area_slug, item.slug]"
            >
              <tui-icon icon="@tui.route" [style.font-size.rem]="1" />
              <span class="text-xs! sm:text-sm! whitespace-nowrap">
                {{ routesCount }} {{ 'routes' | translate }}
              </span>
            </a>
            @if (topoCount > 0) {
              <a
                tuiLink
                appearance="action-grayscale"
                class="flex items-center gap-2 cursor-pointer no-underline! opacity-90 hover:opacity-100 transition-opacity"
                [routerLink]="['/area', item.area_slug, item.slug]"
                [queryParams]="{ tab: 'topos' }"
              >
                <div
                  class="w-4 h-4 bg-current"
                  [style.mask]="'url(image/topo.svg) center/contain no-repeat'"
                ></div>
                <span class="text-xs! sm:text-sm! whitespace-nowrap">
                  {{ topoCount }} {{ 'topos' | translate }}
                </span>
              </a>
            }
            @if (item.approach; as appr) {
              <div class="flex items-center gap-1 opacity-60">
                <tui-icon icon="@tui.footprints" [style.font-size.rem]="1" />
                <span class="text-xs! sm:text-sm! whitespace-nowrap">
                  {{ appr }} min.
                </span>
              </div>
            }
          </div>

          <!-- Topo badges -->
          @if (item.topos.length) {
            <div class="flex flex-wrap gap-2 pt-1">
              @for (topo of item.topos; track topo.id) {
                <button
                  tuiButton
                  size="xs"
                  appearance="info"
                  class="rounded-full!"
                  [routerLink]="[
                    '/area',
                    item.area_slug,
                    item.slug,
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
      @if (item.grades) {
        <app-chart-routes-by-grade extra [grades]="item.grades" />
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
  crag = input.required<CragListItem, Partial<CragListItem>>({
    transform: (value) =>
      ({
        ...value,
        liked: value.liked ?? false,
        grades: value.grades ?? {},
      }) as CragListItem,
  });
  appearance = input<string>('outline');
  showAreaName = input<boolean>(true);
}
