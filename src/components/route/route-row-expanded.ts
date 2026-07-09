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
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  IndoorRouteWithExtras,
  RouteItem,
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
    @let isEditing = global.editingMode();
    @let outdoor = outdoorRoute();
    @let indoor = indoorRoute();

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
            @if (outdoor) {
              @if (outdoor.height) {
                <div class="flex items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.arrow-up-right" class="text-xs" />
                  <span class="font-medium">{{ outdoor.height }}m</span>
                </div>
              }
              @if (outdoor.rating) {
                <div class="flex items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.star" class="text-xs" />
                  <span class="font-medium">{{
                    outdoor.rating | number: '1.1-1'
                  }}</span>
                </div>
              }
            } @else if (indoor) {
              @if (indoor.color) {
                <div class="flex items-center gap-2">
                  <div
                    tuiPin
                    [style.backgroundColor]="indoor.color"
                    style="position: static; transform: scale(0.75); margin: 0;"
                    class="shrink-0"
                  ></div>
                  <span class="text-sm font-semibold">
                    {{ colorName() }}
                  </span>
                </div>
              }
            }
          </div>

          <!-- Right section: Actions -->
          <div class="flex items-center gap-3">
            @if (outdoor) {
              @if (!outdoor.climbed) {
                <button
                  size="m"
                  appearance="neutral"
                  iconStart="@tui.circle-plus"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'ascent.new' | translate"
                  (click.zoneless)="
                    logAscent.emit(outdoor._ref); $event.stopPropagation()
                  "
                >
                  {{ 'ascent.new' | translate }}
                </button>
              } @else if (outdoor._ref.own_ascent; as ascentToEdit) {
                <app-button-ascent-type
                  [type]="$any(ascentToEdit.type)"
                  [active]="true"
                  class="cursor-pointer"
                  tabindex="0"
                  [tuiHint]="'ascent.edit' | translate"
                  (click.zoneless)="
                    editAscent.emit({
                      route: outdoor._ref,
                      own_ascent: ascentToEdit,
                    });
                    $event.stopPropagation()
                  "
                  (keydown.enter)="
                    editAscent.emit({
                      route: outdoor._ref,
                      own_ascent: ascentToEdit,
                    });
                    $event.stopPropagation()
                  "
                />
              }

              @if (!outdoor.climbed) {
                <button
                  size="m"
                  [appearance]="outdoor.project ? 'info' : 'neutral'"
                  iconStart="@tui.bookmark"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'project' | translate"
                  (click.zoneless)="
                    toggleProject.emit(outdoor); $event.stopPropagation()
                  "
                >
                  {{ 'project' | translate }}
                </button>
              }

              @if (canEdit() && showAdminActions()) {
                <button
                  size="s"
                  appearance="neutral"
                  iconStart="@tui.square-pen"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  (click.zoneless)="
                    editRoute.emit(outdoor._ref); $event.stopPropagation()
                  "
                >
                  {{ 'edit' | translate }}
                </button>
                <button
                  size="s"
                  appearance="negative"
                  iconStart="@tui.trash"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  (click.zoneless)="
                    deleteRoute.emit(outdoor._ref); $event.stopPropagation()
                  "
                >
                  {{ 'delete' | translate }}
                </button>
              }
            } @else if (indoor) {
              @if (centerSlug() || indoor.center_slug) {
                @if (indoor.own_ascent; as ascent) {
                  <app-button-ascent-type
                    [type]="ascent.type"
                    [active]="true"
                    class="cursor-pointer"
                    [tuiHint]="'ascent.edit' | translate"
                    (click.zoneless)="
                      editAscent.emit({ route: indoor, own_ascent: ascent });
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
                      logAscent.emit(indoor); $event.stopPropagation()
                    "
                  >
                    {{ 'ascent.new' | translate }}
                  </button>
                }
              }

              @if (canEdit()) {
                <button
                  size="s"
                  appearance="neutral"
                  iconStart="@tui.square-pen"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'edit' | translate"
                  (click.zoneless)="
                    editRoute.emit(indoor); $event.stopPropagation()
                  "
                >
                  {{ 'edit' | translate }}
                </button>
                <button
                  size="s"
                  appearance="negative"
                  iconStart="@tui.trash"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'delete' | translate"
                  (click.zoneless)="
                    deleteRoute.emit(indoor); $event.stopPropagation()
                  "
                >
                  {{ 'delete' | translate }}
                </button>
              }
            }
          </div>
        </div>

        <!-- Second Row: Equippers -->
        @if (canEdit()) {
          <div class="w-full">
            @if (outdoor) {
              <app-route-equippers-input [route]="outdoor._ref" />
            } @else if (indoor) {
              <app-indoor-route-equippers-input [route]="indoor" />
            }
          </div>
        } @else {
          @let equippers =
            outdoor ? outdoor._ref.equippers : indoor?.equippers || [];
          @if (equippers && equippers.length > 0) {
            <div class="flex flex-wrap gap-1 items-center">
              <span class="text-xs opacity-60 mr-1"
                >{{ 'equippers' | translate }}:</span
              >
              @for (e of equippers; track e.id) {
                <button
                  tuiButton
                  appearance="secondary"
                  size="xs"
                  class="min-w-fit! px-2!"
                  (click)="navigateToEquipper(e.id); $event.stopPropagation()"
                >
                  {{ e.name }}
                </button>
              }
            </div>
          }
        }

        <!-- Third Row: Croquis (Topos) -->
        @let outdoorTopos = outdoor?.topos || [];
        @let indoorTopos = indoor?.topos || [];
        @let toposCount = outdoorTopos.length + indoorTopos.length;
        @let canAddTopo = outdoor && isEditing && showAddRouteToTopo();

        @if (toposCount > 0 || canAddTopo) {
          <div
            class="flex flex-wrap gap-1 items-center border-t border-(--tui-border-normal) pt-2"
          >
            <span class="text-xs opacity-60 mr-1"
              >{{ 'topos' | translate }}:</span
            >

            @if (outdoorTopos.length > 0) {
              <div tuiGroup [collapsed]="true">
                @for (t of outdoorTopos; track t.id) {
                  <button
                    tuiButton
                    appearance="secondary"
                    class="min-w-fit!"
                    size="xs"
                    (click.zoneless)="navigateToTopo(t.id)"
                  >
                    {{ t.name }}
                  </button>
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
            } @else if (indoorTopos.length > 0) {
              <div tuiGroup [collapsed]="true">
                @for (t of indoorTopos; track t.id) {
                  <button
                    tuiButton
                    appearance="secondary"
                    class="min-w-fit!"
                    size="xs"
                    [class.opacity-50]="t.legacy"
                    (click.zoneless)="navigateToIndoorTopo(t.id)"
                  >
                    {{ t.name }}
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
                @let cragDetail = global.cragDetail();
                @for (topo of cragDetail?.topos || []; track topo.id) {
                  @let isAttached = outdoor?.topos | includesId: topo.id;
                  <button
                    tuiOption
                    new
                    (click)="
                      toggleRouteOnTopo.emit({
                        topoId: topo.id,
                        routeId: outdoor!._ref.id,
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
        @if (outdoor && showLocation()) {
          <div
            class="text-xs opacity-60 flex gap-1 items-center border-t border-(--tui-border-normal) pt-2"
          >
            <tui-icon icon="@tui.map-pin" class="text-[10px]" />
            <a
              tuiLink
              [routerLink]="['/area', outdoor.area_slug]"
              (click)="$event.stopPropagation()"
            >
              {{ outdoor.area_name }}
            </a>
            <span>/</span>
            <a
              tuiLink
              [routerLink]="['/area', outdoor.area_slug, outdoor.crag_slug]"
              (click)="$event.stopPropagation()"
            >
              {{ outdoor.crag_name }}
            </a>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteRowExpandedComponent {
  isIndoor = input<boolean>(false);
  route = input.required<RoutesTableRow | IndoorRouteWithExtras>();
  canEdit = input<boolean>(false);
  showAdminActions = input<boolean>(true);
  showLocation = input<boolean>(false);
  showAddRouteToTopo = input<boolean>(false);
  centerSlug = input<string | null | undefined>(undefined);

  logAscent = output<RouteItem | IndoorRouteWithExtras>();
  editAscent = output<{
    route: RouteItem | IndoorRouteWithExtras;
    own_ascent: RouteAscentWithExtras | { id: string; type: AscentType | null };
  }>();
  toggleProject = output<RoutesTableRow>();
  editRoute = output<RouteItem | IndoorRouteWithExtras>();
  deleteRoute = output<RouteItem | IndoorRouteWithExtras>();
  toggleRouteOnTopo = output<{
    topoId: number;
    routeId: number;
    isAttached: boolean;
  }>();

  protected readonly global = inject(GlobalData);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly isDropdownOpen = signal(false);

  protected readonly outdoorRoute = computed<RoutesTableRow | null>(() => {
    return this.isIndoor() ? null : (this.route() as RoutesTableRow);
  });

  protected readonly indoorRoute = computed<IndoorRouteWithExtras | null>(
    () => {
      return this.isIndoor() ? (this.route() as IndoorRouteWithExtras) : null;
    },
  );

  protected readonly colorName = computed(() => {
    const routeVal = this.indoorRoute();
    if (!routeVal || !routeVal.color) return '';
    return this.getColorName(routeVal.color);
  });

  protected navigateToTopo(topoId: number): void {
    const r = this.outdoorRoute();
    if (!r || !r.area_slug || !r.crag_slug) return;
    void this.router.navigate([
      '/area',
      r.area_slug,
      r.crag_slug,
      'topo',
      topoId,
    ]);
  }

  protected navigateToIndoorTopo(topoId: string): void {
    const r = this.indoorRoute();
    if (!r) return;
    void this.router.navigate([
      '/indoor',
      this.centerSlug() || r.center_slug,
      'topo',
      topoId,
    ]);
  }

  protected navigateToEquipper(id: string | number): void {
    void this.router.navigate(['/equipper', String(id)]);
  }

  private getColorName(colorValue: string): string {
    const colorName = INDOOR_ROUTE_COLORS[colorValue];
    return colorName
      ? this.translate.instant('colors.' + colorName)
      : colorValue;
  }
}
