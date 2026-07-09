import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiGroup,
  TuiHint,
  TuiIcon,
  TuiLink,
} from '@taiga-ui/core';
import { TuiPin } from '@taiga-ui/kit';

import { GlobalData } from '../../services/global-data';
import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
import { RouteEquippersInputComponent } from './route-equippers-input';
import { IndoorRouteEquippersInputComponent } from './indoor-route-equippers-input';
import { IncludesIdPipe } from '../../pipes/includes-id.pipe';

import {
  RoutesTableRow,
  RouteItem,
  IndoorRouteWithExtras,
  RouteAscentWithExtras,
  AscentType,
  INDOOR_ROUTE_COLORS,
} from '../../models';

@Component({
  selector: 'app-route-row-expanded',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TranslateModule,
    RouterLink,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiHint,
    TuiGroup,
    TuiDropdown,
    TuiDataList,
    TuiPin,
    ButtonAscentTypeComponent,
    RouteEquippersInputComponent,
    IndoorRouteEquippersInputComponent,
    IncludesIdPipe,
  ],
  template: `
    @let item = route();

    <div class="w-full box-border px-1 py-2">
      <div
        class="flex flex-col gap-3 p-3 bg-(--tui-background-neutral-1) rounded-2xl border border-(--tui-border-normal) w-full overflow-hidden"
      >
        <!-- First Row: Metadata & Actions -->
        <div
          class="flex flex-wrap items-center justify-between gap-x-2 gap-y-2"
        >
          <!-- Left section: Metadata -->
          <div class="flex items-center gap-3">
            @if (item.height) {
              <div class="flex items-center gap-1 opacity-70">
                <tui-icon icon="@tui.arrow-up-right" class="text-xs" />
                <span class="font-medium">{{ item.height }}m</span>
              </div>
            }
            @if (item.color) {
              <div class="flex items-center gap-2">
                <div
                  tuiPin
                  [style.backgroundColor]="item.color"
                  style="position: static; transform: scale(0.75); margin: 0;"
                  class="shrink-0"
                ></div>
                <span class="text-sm font-semibold">
                  @let colorNameKey =
                    item.color ? indoorRouteColors[item.color] || '' : '';
                  @if (colorNameKey) {
                    {{ 'colors.' + colorNameKey | translate }}
                  } @else {
                    {{ item.color }}
                  }
                </span>
              </div>
            }
            @if (item.rating) {
              <div class="flex items-center gap-1 opacity-70">
                <tui-icon icon="@tui.star" class="text-xs" />
                <span class="font-medium">{{
                  item.rating | number: '1.1-1'
                }}</span>
              </div>
            }
          </div>

          <!-- Right section: Actions -->
          <div class="flex items-center gap-3">
            @if (item.own_ascent; as ascent) {
              <app-button-ascent-type
                [type]="$any(ascent.type)"
                [active]="true"
                class="cursor-pointer"
                [tuiHint]="'ascent.edit' | translate"
                (click.zoneless)="
                  editAscent.emit({ route: item._ref, own_ascent: ascent });
                  $event.stopPropagation()
                "
              />
            } @else {
              <button
                size="m"
                appearance="neutral"
                iconStart="@tui.circle-plus"
                tuiIconButton
                type="button"
                class="rounded-full!"
                [tuiHint]="'ascent.new' | translate"
                (click.zoneless)="
                  logAscent.emit(item._ref); $event.stopPropagation()
                "
              >
                {{ 'ascent.new' | translate }}
              </button>
            }

            @if (!item.isIndoor && !item.climbed) {
              <button
                size="m"
                [appearance]="item.project ? 'info' : 'neutral'"
                iconStart="@tui.bookmark"
                tuiIconButton
                type="button"
                class="rounded-full!"
                [tuiHint]="'project' | translate"
                (click.zoneless)="
                  toggleProject.emit(item); $event.stopPropagation()
                "
              >
                {{ 'project' | translate }}
              </button>
            }

            @if (item.canEdit && showAdminActions()) {
              <button
                size="s"
                appearance="neutral"
                iconStart="@tui.square-pen"
                tuiIconButton
                type="button"
                class="rounded-full!"
                [tuiHint]="'edit' | translate"
                (click.zoneless)="
                  editRoute.emit(item._ref); $event.stopPropagation()
                "
              >
                {{ 'edit' | translate }}
              </button>
              @if (item.canDelete) {
                <button
                  size="s"
                  appearance="negative"
                  iconStart="@tui.trash"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'delete' | translate"
                  (click.zoneless)="
                    deleteRoute.emit(item._ref); $event.stopPropagation()
                  "
                >
                  {{ 'delete' | translate }}
                </button>
              }
            }
          </div>
        </div>

        <!-- Second Row: Equippers -->
        @if (item.canEdit) {
          <div class="w-full">
            @if (outdoorRouteRef(); as outRef) {
              <app-route-equippers-input [route]="outRef" />
            } @else if (indoorRoute(); as inRef) {
              <app-indoor-route-equippers-input [route]="inRef" />
            }
          </div>
        } @else {
          @let equippers = item.equippers;
          @if (equippers && equippers.length > 0) {
            <div class="flex flex-wrap gap-1 items-center">
              <span class="text-xs opacity-60 mr-1"
                >{{ 'equippers' | translate }}:</span
              >
              @for (e of equippers; track e.id) {
                <a
                  tuiLink
                  [routerLink]="['/equipper', e.id]"
                  class="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                  (click)="$event.stopPropagation()"
                >
                  {{ e.name }}
                </a>
              }
            </div>
          }
        }

        <!-- Third Row: Croquis (Topos) -->
        @let toposList = item.topos;
        @let toposCount = toposList.length;
        @let canAddTopo = item.canAddTopo && showAddRouteToTopo();

        @if (toposCount > 0 || canAddTopo) {
          <div
            class="flex flex-wrap gap-1 items-center border-t border-(--tui-border-normal) pt-2"
          >
            <span class="text-xs opacity-60 mr-1"
              >{{ 'topos' | translate }}:</span
            >

            @if (toposList.length > 0) {
              <div tuiGroup [collapsed]="true">
                @for (t of toposList; track t.id) {
                  <a
                    tuiLink
                    [routerLink]="t.link"
                    class="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                    (click)="$event.stopPropagation()"
                  >
                    {{ t.name }}
                  </a>
                }
                @if (canAddTopo) {
                  <button
                    appearance="secondary"
                    size="xs"
                    tuiIconButton
                    type="button"
                    iconStart="@tui.chevron-down"
                    [tuiDropdown]="toposMenuExpanded"
                    [tuiDropdownOpen]="isDropdownOpen()"
                    (tuiDropdownOpenChange)="isDropdownOpen.set($event)"
                    (click.zoneless)="$event.stopPropagation()"
                  >
                    {{ 'addRouteToTopo' | translate }}
                  </button>
                }
              </div>
            } @else if (canAddTopo) {
              <button
                appearance="flat-grayscale"
                size="xs"
                tuiButton
                type="button"
                class="rounded-full!"
                iconStart="@tui.plus"
                [tuiDropdown]="toposMenuExpanded"
                [tuiDropdownOpen]="isDropdownOpen()"
                (tuiDropdownOpenChange)="isDropdownOpen.set($event)"
                (click.zoneless)="$event.stopPropagation()"
              >
                {{ 'addRouteToTopo' | translate }}
              </button>
            }

            <ng-template #toposMenuExpanded>
              <tui-data-list>
                @let list = availableTopos();
                @for (topo of list; track topo.id) {
                  @let isAttached = item.topos | includesId: topo.id;
                  <button
                    tuiOption
                    new
                    (click)="
                      toggleRouteOnTopo.emit({
                        topoId: topo.id,
                        routeId: item.id,
                        isAttached: isAttached,
                      });
                      isDropdownOpen.set(false)
                    "
                  >
                    <tui-icon
                      [icon]="isAttached ? '@tui.check' : '@tui.image'"
                      class="mr-2"
                    />
                    {{ topo.name }}
                  </button>
                }
              </tui-data-list>
            </ng-template>
          </div>
        }

        <!-- Fourth Row: Location -->
        @if (!item.isIndoor && showLocation() && item.area_slug) {
          <div
            class="text-xs opacity-60 flex gap-1 items-center border-t border-(--tui-border-normal) pt-2"
          >
            <tui-icon icon="@tui.map-pin" class="text-[10px]" />
            <a
              tuiLink
              [routerLink]="['/area', item.area_slug]"
              (click)="$event.stopPropagation()"
            >
              {{ item.area_name }}
            </a>
            <span>/</span>
            <a
              tuiLink
              [routerLink]="['/area', item.area_slug, item.crag_slug]"
              (click)="$event.stopPropagation()"
            >
              {{ item.crag_name }}
            </a>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteRowExpandedComponent {
  route = input.required<RoutesTableRow>();
  showAdminActions = input<boolean>(true);
  showLocation = input<boolean>(false);
  showAddRouteToTopo = input<boolean>(false);
  availableTopos = input<{ id: number | string; name: string }[]>([]);

  logAscent = output<RouteItem | IndoorRouteWithExtras>();
  editAscent = output<{
    route: RouteItem | IndoorRouteWithExtras;
    own_ascent:
      | RouteAscentWithExtras
      | { id: string | number; type: AscentType | null };
  }>();
  toggleProject = output<RoutesTableRow>();
  editRoute = output<RouteItem | IndoorRouteWithExtras>();
  deleteRoute = output<RouteItem | IndoorRouteWithExtras>();
  toggleRouteOnTopo = output<{
    topoId: number | string;
    routeId: number | string;
    isAttached: boolean;
  }>();

  protected readonly global = inject(GlobalData);

  protected readonly isDropdownOpen = signal(false);

  protected readonly outdoorRouteRef = computed<RouteItem | null>(() => {
    const r = this.route();
    return r && !r.isIndoor ? (r._ref as RouteItem) : null;
  });

  protected readonly indoorRoute = computed<IndoorRouteWithExtras | null>(
    () => {
      const r = this.route();
      return r && r.isIndoor ? (r._ref as IndoorRouteWithExtras) : null;
    },
  );

  protected readonly indoorRouteColors = INDOOR_ROUTE_COLORS;
}
