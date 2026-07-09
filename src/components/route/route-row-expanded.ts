/* eslint-disable @typescript-eslint/no-explicit-any */
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
          @let cragDetail = global.cragDetail();
          <div
            class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0"
          >
            <div class="flex items-center gap-3">
              @if (route().height) {
                <div class="flex items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.arrow-up-right" class="text-xs" />
                  <span class="font-medium">{{ route().height }}m</span>
                </div>
              }
              <div class="flex items-center gap-1 opacity-70">
                <tui-icon icon="@tui.star" class="text-xs" />
                <span class="font-medium">{{
                  route().rating | number: '1.1-1'
                }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap gap-x-1 gap-y-0">
                @let toposCountExp = route().topos?.length || 0;
                @if (toposCountExp > 0) {
                  <div tuiGroup [collapsed]="true">
                    @for (t of route().topos; track t.id) {
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
                      @let isAttached = route().topos | includesId: topo.id;
                      <button
                        tuiOption
                        new
                        (click)="
                          toggleRouteOnTopo.emit({
                            topoId: topo.id,
                            routeId: route()._ref.id,
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

              @if (route().ascents; as ascents) {
                <div class="flex items-center gap-1 opacity-70">
                  <span class="font-medium">{{ route().ascents }}</span>
                  {{
                    (ascents > 1 ? 'ascents' : 'ascent') | translate | lowercase
                  }}
                </div>
              }
            </div>

            <div class="flex items-center gap-3">
              @if (!route().climbed) {
                <button
                  size="m"
                  appearance="neutral"
                  iconStart="@tui.circle-plus"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'ascent.new' | translate"
                  (click.zoneless)="
                    logAscent.emit(route()._ref); $event.stopPropagation()
                  "
                >
                  {{ 'ascent.new' | translate }}
                </button>
              } @else if (route()._ref.own_ascent; as ascentToEdit) {
                <app-button-ascent-type
                  [type]="ascentToEdit?.type"
                  [active]="true"
                  class="cursor-pointer"
                  tabindex="0"
                  [tuiHint]="'ascent.edit' | translate"
                  (click.zoneless)="
                    editAscent.emit({
                      route: route()._ref,
                      own_ascent: ascentToEdit,
                    });
                    $event.stopPropagation()
                  "
                  (keydown.enter)="
                    editAscent.emit({
                      route: route()._ref,
                      own_ascent: ascentToEdit,
                    });
                    $event.stopPropagation()
                  "
                />
              }

              @if (!route().climbed) {
                <button
                  size="m"
                  [appearance]="route().project ? 'info' : 'neutral'"
                  iconStart="@tui.bookmark"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  [tuiHint]="'project' | translate"
                  (click.zoneless)="
                    toggleProject.emit(route()); $event.stopPropagation()
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
                    editRoute.emit(route()._ref); $event.stopPropagation()
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
                    deleteRoute.emit(route()._ref); $event.stopPropagation()
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
              <app-route-equippers-input [route]="route()._ref" />
            </div>
          } @else if (route()._ref.equippers; as equippers) {
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
                    (click)="navigateToEquipper(e.id); $event.stopPropagation()"
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
                [routerLink]="['/area', route().area_slug]"
                (click)="$event.stopPropagation()"
              >
                {{ route().area_name }}
              </a>
              <span>/</span>
              <a
                tuiLink
                [routerLink]="['/area', route().area_slug, route().crag_slug]"
                (click)="$event.stopPropagation()"
              >
                {{ route().crag_name }}
              </a>
            </div>
          }
          @
        } @else {
          <!-- Indoor Layout -->
          @let routeVal = route();
          <div class="flex items-center justify-between">
            <!-- Color -->
            @if (routeVal.color) {
              <div class="flex items-center gap-2">
                <div
                  tuiPin
                  [style.backgroundColor]="routeVal.color"
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
              @if (centerSlug() || routeVal.center_slug) {
                @if (routeVal.own_ascent; as ascent) {
                  <app-button-ascent-type
                    [type]="$any(ascent.type)"
                    [active]="true"
                    class="cursor-pointer"
                    [tuiHint]="'ascent.edit' | translate"
                    (click.zoneless)="
                      editAscent.emit({ route: routeVal, own_ascent: ascent });
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
                      logAscent.emit(routeVal); $event.stopPropagation()
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
                    editRoute.emit(routeVal); $event.stopPropagation()
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
                    deleteRoute.emit(routeVal); $event.stopPropagation()
                  "
                >
                  {{ 'delete' | translate }}
                </button>
              }
            </div>
          </div>

          <!-- Equippers -->
          @if (routeVal.equippers; as equippers) {
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
          @if (routeVal.topos && routeVal.topos.length > 0) {
            <div class="flex flex-wrap gap-1 items-center">
              @for (t of routeVal.topos; track t.id) {
                <a
                  tuiLink
                  [routerLink]="[
                    '/indoor',
                    centerSlug() || routeVal.center_slug,
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
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteRowExpandedComponent {
  isIndoor = input<boolean>(false);
  route = input.required<any>();
  canEdit = input<boolean>(false);
  showAdminActions = input<boolean>(true);
  showLocation = input<boolean>(false);
  showAddRouteToTopo = input<boolean>(false);
  centerSlug = input<string | null | undefined>(undefined);

  logAscent = output<any>();
  editAscent = output<{ route: any; own_ascent: any }>();
  toggleProject = output<any>();
  editRoute = output<any>();
  deleteRoute = output<any>();
  toggleRouteOnTopo = output<{
    topoId: number;
    routeId: number;
    isAttached: boolean;
  }>();

  protected readonly global = inject(GlobalData);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly isDropdownOpen = signal(false);

  protected readonly colorName = computed(() => {
    const routeVal = this.route();
    if (!routeVal || !('color' in routeVal) || !routeVal.color) return '';
    return this.getColorName(routeVal.color);
  });

  protected navigateToTopo(topoId: number): void {
    const r = this.route();
    if (!r.area_slug || !r.crag_slug) return;
    void this.router.navigate([
      '/area',
      r.area_slug,
      r.crag_slug,
      'topo',
      topoId,
    ]);
  }

  protected navigateToEquipper(id: string): void {
    void this.router.navigate(['/equipper', id]);
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
