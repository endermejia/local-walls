import { CommonModule, DecimalPipe, LowerCasePipe } from '@angular/common';
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
import { IncludesIdPipe } from '../../pipes/includes-id.pipe';
import {
  RoutesTableRow,
  IndoorRouteWithExtras,
  RouteItem,
  RouteAscentWithExtras,
  AscentType,
} from '../../models';

@Component({
  selector: 'app-route-row-expanded',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    LowerCasePipe,
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
    IncludesIdPipe,
  ],
  template: `
    @let isEditing = global.editingMode();
    <div class="w-full box-border px-1 py-2">
      <div
        class="flex flex-col gap-3 p-3 bg-(--tui-background-neutral-1) rounded-2xl border border-(--tui-border-normal) w-full overflow-hidden"
      >
        @if (!isIndoor()) {
          <!-- Outdoor Layout -->
          @let r = outdoorRoute();
          @if (r) {
            @let cragDetail = global.cragDetail();
            <div
              class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0"
            >
              <div class="flex items-center gap-3">
                @if (r.height) {
                  <div class="flex items-center gap-1 opacity-70">
                    <tui-icon icon="@tui.arrow-up-right" class="text-xs" />
                    <span class="font-medium">{{ r.height }}m</span>
                  </div>
                }
                <div class="flex items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.star" class="text-xs" />
                  <span class="font-medium">{{
                    r.rating | number: '1.1-1'
                  }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap gap-x-1 gap-y-0">
                  @let toposCountExp = r.topos.length;
                  @if (toposCountExp > 0) {
                    <div tuiGroup [collapsed]="true">
                      @for (t of r.topos; track t.id) {
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
                      @if (isEditing && showAddRouteToTopo()) {
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
                  } @else if (isEditing && showAddRouteToTopo()) {
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
                      @for (topo of cragDetail?.topos || []; track topo.id) {
                        @let isAttached = r.topos | includesId: topo.id;
                        <button
                          tuiOption
                          new
                          (click)="
                            toggleRouteOnTopo.emit({
                              topoId: topo.id,
                              routeId: r._ref.id,
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

                @if (r.ascents; as ascents) {
                  <div class="flex items-center gap-1 opacity-70">
                    <span class="font-medium">{{ r.ascents }}</span>
                    {{
                      (ascents > 1 ? 'ascents' : 'ascent')
                        | translate
                        | lowercase
                    }}
                  </div>
                }
              </div>

              <div class="flex items-center gap-3">
                @if (!r.climbed) {
                  <button
                    size="m"
                    appearance="neutral"
                    iconStart="@tui.circle-plus"
                    tuiIconButton
                    type="button"
                    class="rounded-full!"
                    [tuiHint]="'ascent.new' | translate"
                    (click.zoneless)="
                      logAscent.emit(r._ref); $event.stopPropagation()
                    "
                  >
                    {{ 'ascent.new' | translate }}
                  </button>
                } @else if (r._ref.own_ascent; as ascentToEdit) {
                  <app-button-ascent-type
                    [type]="ascentToEdit?.type"
                    [active]="true"
                    class="cursor-pointer"
                    tabindex="0"
                    [tuiHint]="'ascent.edit' | translate"
                    (click.zoneless)="
                      editAscent.emit({
                        route: r._ref,
                        own_ascent: ascentToEdit,
                      });
                      $event.stopPropagation()
                    "
                    (keydown.enter)="
                      editAscent.emit({
                        route: r._ref,
                        own_ascent: ascentToEdit,
                      });
                      $event.stopPropagation()
                    "
                  />
                }

                @if (!r.climbed) {
                  <button
                    size="m"
                    [appearance]="r.project ? 'info' : 'neutral'"
                    iconStart="@tui.bookmark"
                    tuiIconButton
                    type="button"
                    class="rounded-full!"
                    [tuiHint]="'project' | translate"
                    (click.zoneless)="
                      toggleProject.emit(r); $event.stopPropagation()
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
                      editRoute.emit(r._ref); $event.stopPropagation()
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
                      deleteRoute.emit(r._ref); $event.stopPropagation()
                    "
                  >
                    {{ 'delete' | translate }}
                  </button>
                }
              </div>
            </div>

            <!-- Equippers -->
            @if (canEdit()) {
              <div class="w-full">
                <app-route-equippers-input [route]="r._ref" />
              </div>
            } @else if (r._ref.equippers; as equippers) {
              @if (equippers.length > 0) {
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
                      (click)="
                        navigateToEquipper(e.id); $event.stopPropagation()
                      "
                    >
                      {{ e.name }}
                    </button>
                  }
                </div>
              }
            }

            @if (showLocation()) {
              <div
                class="text-xs opacity-60 flex gap-1 items-center border-t border-(--tui-border-normal) pt-2"
              >
                <tui-icon icon="@tui.map-pin" class="text-[10px]" />
                <a
                  tuiLink
                  [routerLink]="['/area', r.area_slug]"
                  (click)="$event.stopPropagation()"
                >
                  {{ r.area_name }}
                </a>
                <span>/</span>
                <a
                  tuiLink
                  [routerLink]="['/area', r.area_slug, r.crag_slug]"
                  (click)="$event.stopPropagation()"
                >
                  {{ r.crag_name }}
                </a>
              </div>
            }
          }
          @
        } @else {
          <!-- Indoor Layout -->
          @let r = indoorRoute();
          @if (r) {
            <div class="flex items-center justify-between">
              <!-- Color -->
              @if (r.color) {
                <div class="flex items-center gap-2">
                  <div
                    tuiPin
                    [style.backgroundColor]="r.color"
                    style="position: static; transform: scale(0.75); margin: 0;"
                    class="shrink-0"
                  ></div>
                  <span class="text-sm font-semibold">
                    {{ colorName() }}
                  </span>
                </div>
              } @else {
                <span class="opacity-50 text-xs">-</span>
              }

              <!-- Actions -->
              <div class="flex items-center gap-3">
                @if (centerSlug() || r.center_slug) {
                  @if (r.own_ascent; as ascent) {
                    <app-button-ascent-type
                      [type]="ascent.type"
                      [active]="true"
                      class="cursor-pointer"
                      [tuiHint]="'ascent.edit' | translate"
                      (click.zoneless)="
                        editAscent.emit({ route: r, own_ascent: ascent });
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
                        logAscent.emit(r); $event.stopPropagation()
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
                      editRoute.emit(r); $event.stopPropagation()
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
                      deleteRoute.emit(r); $event.stopPropagation()
                    "
                  >
                    {{ 'delete' | translate }}
                  </button>
                }
              </div>
            </div>

            <!-- Equippers -->
            @if (r.equippers; as equippers) {
              @if (equippers.length > 0) {
                <div class="flex flex-wrap gap-1 items-center">
                  @for (eq of equippers; track eq.id) {
                    <button
                      tuiButton
                      appearance="secondary"
                      size="xs"
                      class="min-w-fit! px-2!"
                      [routerLink]="['/equipper', eq.id]"
                      (click)="$event.stopPropagation()"
                    >
                      {{ eq.name }}
                    </button>
                  }
                </div>
              }
            }

            <!-- Topos (Mobile expanded view) -->
            @if (r.topos && r.topos.length > 0) {
              <div class="flex flex-wrap gap-1 items-center">
                @for (t of r.topos; track t.id) {
                  <a
                    tuiLink
                    [routerLink]="[
                      '/indoor',
                      centerSlug() || r.center_slug,
                      'topo',
                      t.id,
                    ]"
                    class="text-xs bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors"
                    [class.opacity-50]="t.legacy"
                    (click)="$event.stopPropagation()"
                  >
                    {{ t.name }}
                  </a>
                }
              </div>
            }
          }
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

  protected navigateToEquipper(id: string | number): void {
    void this.router.navigate(['/equipper', String(id)]);
  }

  private getColorName(colorValue: string): string {
    const colors = [
      { value: '#EF4444', name: 'red' },
      { value: '#3B82F6', name: 'blue' },
      { value: '#F97316', name: 'orange' },
      { value: '#06B6D4', name: 'cyan' },
      { value: '#EAB308', name: 'yellow' },
      { value: '#22C55E', name: 'green' },
      { value: '#EC4899', name: 'pink' },
      { value: '#A855F7', name: 'purple' },
      { value: '#ffffff', name: 'white' },
      { value: '#000000', name: 'black' },
      { value: '#6B7280', name: 'grey' },
      { value: '#84CC16', name: 'lime' },
      { value: '#14B8A6', name: 'teal' },
      { value: '#6366F1', name: 'indigo' },
      { value: '#D946EF', name: 'magenta' },
    ];
    const colorObj = colors.find((c) => c.value === colorValue);
    return colorObj
      ? this.translate.instant('colors.' + colorObj.name)
      : colorValue;
  }
}
