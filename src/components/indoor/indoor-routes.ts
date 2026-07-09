import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
  signal,
  effect,
  viewChildren,
  PLATFORM_ID,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { GlobalData } from '../../services/global-data';

import {
  TuiLoader,
  TuiButton,
  TuiScrollbar,
  TuiLink,
  TuiHint,
  TuiCheckbox,
  TuiDialogService,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiPin,
  TuiChevron,
  TUI_CONFIRM,
  TuiConfirmData,
} from '@taiga-ui/kit';
import {
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableCell,
  TuiTableHead,
  TuiTableExpand,
  TuiTableSortChange,
  TuiSortDirection,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { IndoorService } from '../../services/indoor.service';
import { AscentsService } from '../../services/ascents.service';
import {
  IndoorRouteWithExtras,
  RouteItem,
  AscentType,
  RouteAscentWithExtras,
} from '../../models';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import { IndoorRouteEquippersInputComponent } from '../route/indoor-route-equippers-input';
import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
import { RouteRowExpandedComponent } from '../route/route-row-expanded';

@Component({
  selector: 'app-indoor-routes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterLink,
    TuiLoader,
    TuiBadge,
    TuiButton,
    TuiScrollbar,
    TuiLink,
    TuiHint,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableCell,
    TuiTableHead,
    TuiTableExpand,
    GradeComponent,
    EmptyStateComponent,
    IndoorRouteEquippersInputComponent,
    ButtonAscentTypeComponent,
    RouteRowExpandedComponent,
    TuiCheckbox,
    TuiPin,
    TuiChevron,
  ],
  template: `
    <div class="flex flex-col gap-4">
      @if (hasAnyRoutes()) {
        <div class="flex items-center justify-between px-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              tuiCheckbox
              type="checkbox"
              [ngModel]="showLegacyRoutes()"
              (ngModelChange)="showLegacyRoutes.set($event)"
              autocomplete="off"
            />
            <span class="text-xs opacity-75 select-none">{{
              'indoor.showLegacyRoutes' | translate
            }}</span>
          </label>

          @if (totalRoutes() > 0) {
            <div
              class="flex items-center gap-2 text-xs font-semibold opacity-70"
            >
              @if (allCompleted()) {
                {{ 'indoor.allCompleted' | translate }}
              } @else {
                {{
                  'indoor.partialCompleted'
                    | translate
                      : {
                          completed: totalRoutes() - pendingRoutes(),
                          total: totalRoutes(),
                        }
                }}
              }
            </div>
          }

          @if (canEdit()) {
            <button
              tuiButton
              appearance="textfield"
              size="s"
              iconStart="@tui.plus"
              (click.zoneless)="createRoute()"
            >
              {{ 'new' | translate }}
            </button>
          }
        </div>
      } @else if (canEdit()) {
        <div class="flex justify-end px-3">
          <button
            tuiButton
            appearance="textfield"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createRoute()"
          >
            {{ 'new' | translate }}
          </button>
        </div>
      }

      @if (routes().length > 0) {
        <tui-scrollbar
          class="grow min-h-0 block w-full overflow-x-auto no-scrollbar"
        >
          <table
            tuiTable
            [size]="'m'"
            class="w-full"
            [columns]="columns()"
            [direction]="currentDirection"
            [sorter]="currentSorter"
            (sortChange)="onSortChange($event)"
          >
            <thead tuiThead>
              <tr tuiThGroup>
                @for (col of columns(); track col) {
                  <th
                    *tuiHead="col"
                    tuiTh
                    [sorter]="getSorter(col)"
                    [class.text-right]="
                      col === 'actions' || col === 'admin_actions'
                    "
                    [class.w-12!]="col === 'expand'"
                    [class.w-20!]="col === 'grade'"
                    [class.w-24!]="col === 'color'"
                    [class.w-32!]="col === 'actions' || col === 'admin_actions'"
                    [class.w-64!]="col === 'equippers'"
                  >
                    @if (col === 'expand') {
                      <button
                        appearance="flat-grayscale"
                        size="xs"
                        tuiIconButton
                        type="button"
                        class="rounded-full!"
                        [tuiChevron]="allExpanded()"
                        (click.zoneless)="toggleAllExpanded()"
                      >
                        Toggle All
                      </button>
                    } @else {
                      {{
                        col === 'actions' || col === 'admin_actions'
                          ? ''
                          : (col | translate)
                      }}
                    }
                  </th>
                }
              </tr>
            </thead>
            @let sortedData = routes() | tuiTableSort;
            <tbody tuiTbody>
              @for (item of sortedData; track item.id) {
                <tr
                  tuiTr
                  [style.background]="
                    item.own_ascent
                      ? getAscentBackground(item.own_ascent.type)
                      : ''
                  "
                >
                  @for (col of columns(); track col) {
                    <td
                      *tuiCell="col"
                      tuiTd
                      [class.text-right]="
                        col === 'actions' || col === 'admin_actions'
                      "
                    >
                      @switch (col) {
                        @case ('expand') {
                          <button
                            appearance="flat-grayscale"
                            size="xs"
                            tuiIconButton
                            type="button"
                            class="rounded-full!"
                            [tuiChevron]="exp.expanded()"
                            (click.zoneless)="exp.toggle()"
                          >
                            Toggle
                          </button>
                        }
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-grade
                              [grade]="item.grade || 0"
                              [kind]="item.climbing_kind"
                            />
                          </div>
                        }
                        @case ('route') {
                          <div tuiCell size="m">
                            <div
                              class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
                            >
                              <a
                                tuiLink
                                [routerLink]="[
                                  '/indoor',
                                  item.center_slug || centerSlug(),
                                  'route',
                                  item.slug,
                                ]"
                                class="font-bold text-base truncate max-w-full"
                              >
                                {{ item.name || ('route' | translate) }}
                              </a>
                              @if (item.legacy) {
                                <span
                                  tuiBadge
                                  size="s"
                                  appearance="neutral"
                                  class="uppercase text-[10px] shrink-0"
                                >
                                  {{ 'indoor.legacy' | translate }}
                                </span>
                              }
                            </div>
                          </div>
                        }

                        @case ('topo') {
                          <div tuiCell size="m">
                            <div class="flex flex-wrap gap-1 min-w-0">
                              @for (t of item.topos; track t.id) {
                                <a
                                  tuiLink
                                  [routerLink]="[
                                    '/indoor',
                                    centerSlug() || item.center_slug,
                                    'topo',
                                    t.id,
                                  ]"
                                  class="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                                  [class.opacity-50]="t.legacy"
                                >
                                  {{ t.name }}
                                </a>
                              } @empty {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            </div>
                          </div>
                        }
                        @case ('color') {
                          <div tuiCell size="m">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (item.color) {
                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                  style="position: static; transform: scale(0.75); margin: 0;"
                                  class="shrink-0"
                                ></div>
                                <span class="text-sm truncate">
                                  {{ getColorName(item.color) }}
                                </span>
                              } @else {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            </div>
                          </div>
                        }
                        @case ('equippers') {
                          <div tuiCell size="m" class="grow min-w-0">
                            <div class="flex flex-col gap-1 w-full">
                              @if (canEdit()) {
                                <app-indoor-route-equippers-input
                                  [route]="item"
                                  (equippersChanged)="routesResource.reload()"
                                />
                              } @else {
                                <div class="flex flex-wrap gap-1 items-center">
                                  @for (eq of item.equippers; track eq.id) {
                                    <button
                                      tuiButton
                                      appearance="secondary"
                                      size="xs"
                                      class="min-w-fit! px-2!"
                                      [routerLink]="['/equipper', eq.id]"
                                    >
                                      {{ eq.name }}
                                    </button>
                                  } @empty {
                                    <span class="opacity-50 text-xs">-</span>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }
                        @case ('actions') {
                          @if (item.own_ascent; as ascent) {
                            <app-button-ascent-type
                              [type]="ascent.type"
                              [active]="true"
                              class="cursor-pointer"
                              [tuiHint]="'ascent.edit' | translate"
                              (click.zoneless)="editAscent(item, ascent)"
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
                              (click.zoneless)="logAscent(item)"
                            >
                              {{ 'ascent.new' | translate }}
                            </button>
                          }
                        }
                        @case ('admin_actions') {
                          <div class="flex gap-1 justify-end items-center">
                            <button
                              size="s"
                              appearance="neutral"
                              iconStart="@tui.square-pen"
                              tuiIconButton
                              type="button"
                              class="rounded-full!"
                              [tuiHint]="'edit' | translate"
                              (click.zoneless)="editRoute(item)"
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
                              (click.zoneless)="deleteRoute(item)"
                            >
                              {{ 'delete' | translate }}
                            </button>
                          </div>
                        }
                      }
                    </td>
                  }
                </tr>
                <tui-table-expand #exp [expanded]="false">
                  <tr>
                    <td
                      [colSpan]="columns().length"
                      class="p-0! border-none! w-full! max-w-full!"
                    >
                      <app-route-row-expanded
                        [isIndoor]="true"
                        [route]="item"
                        [canEdit]="canEdit()"
                        [centerSlug]="centerSlug()"
                        (logAscent)="logAscent($event)"
                        (editAscent)="
                          editAscent($event.route, $event.own_ascent)
                        "
                        (editRoute)="editRoute($event)"
                        (deleteRoute)="deleteRoute($event)"
                      />
                    </td>
                  </tr>
                </tui-table-expand>
              }
            </tbody>
          </table>
        </tui-scrollbar>
      } @else if (routesResource.isLoading()) {
        <tui-loader />
      } @else {
        <app-empty-state />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRoutesComponent {
  centerId = input<string | undefined>(undefined);
  centerSlug = input<string | undefined>(undefined);
  customRoutes = input<IndoorRouteWithExtras[] | null>(null);

  protected readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly columns = computed(() => {
    if (this.global.isMobile()) {
      const cols = [
        'expand',
        'grade',
        'route',
        'rating',
        'ascents',
        'topo',
        'color',
      ];
      if (this.centerSlug() || this.routes().some((r) => r.center_slug)) {
        cols.push('actions');
      }
      return cols;
    }
    const cols = [
      'grade',
      'route',
      'rating',
      'ascents',
      'topo',
      'color',
      'equippers',
    ];
    if (this.centerSlug() || this.routes().some((r) => r.center_slug)) {
      cols.push('actions');
    }
    if (this.canEdit()) {
      cols.push('admin_actions');
    }
    return cols;
  });

  protected readonly canEdit = computed(() => {
    const id = this.centerId();
    return id ? !!this.global.indoorAdminPermissions()[id] : false;
  });

  protected readonly showLegacyRoutes = signal<boolean>(
    (() => {
      try {
        return (
          typeof window !== 'undefined' &&
          localStorage.getItem('show_legacy_routes') === 'true'
        );
      } catch {
        return false;
      }
    })(),
  );

  constructor() {
    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'show_legacy_routes',
            String(this.showLegacyRoutes()),
          );
        }
      } catch {}
    });
  }

  protected readonly hasAnyRoutes = computed(() => {
    return (
      this.centerId() !== undefined || (this.customRoutes() || []).length > 0
    );
  });

  protected readonly routes = computed<IndoorRouteWithExtras[]>(() => {
    const custom = this.customRoutes();
    const list = custom !== null ? custom : this.routesResource.value() || [];
    if (custom !== null && !this.showLegacyRoutes()) {
      return list.filter((r) => !r.legacy);
    }
    return list;
  });

  protected readonly totalRoutes = computed(() => {
    return this.routes().length;
  });

  protected readonly pendingRoutes = computed(() => {
    return this.routes().filter((r) => !r.own_ascent).length;
  });

  protected readonly allCompleted = computed(() => {
    const total = this.totalRoutes();
    return total > 0 && this.pendingRoutes() === 0;
  });

  protected readonly routesResource = resource<
    IndoorRouteWithExtras[],
    { id: string | undefined; showLegacyRoutes: boolean }
  >({
    params: () => ({
      id: this.centerId(),
      showLegacyRoutes: this.showLegacyRoutes(),
    }),
    loader: ({ params }) =>
      params.id
        ? this.indoor.getCenterRoutes(params.id, params.showLegacyRoutes)
        : Promise.resolve([]),
  });

  async createRoute(): Promise<void> {
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoor.openIndoorRouteForm(id);
    if (success) {
      this.routesResource.reload();
    }
  }

  async editRoute(route: IndoorRouteWithExtras | RouteItem): Promise<void> {
    const id = this.centerId();
    if (!id) return;
    const r = route as IndoorRouteWithExtras;
    const success = await this.indoor.openIndoorRouteForm(id, r);
    if (success) {
      this.routesResource.reload();
    }
  }

  async deleteRoute(route: IndoorRouteWithExtras | RouteItem): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const r = route as IndoorRouteWithExtras;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name || this.translate.instant('route'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then(async (confirmed) => {
      if (!confirmed) return;
      await this.indoor.deleteRoute(r.id);
      if (this.centerId()) {
        this.routesResource.reload();
      }
    });
  }

  protected readonly getColorName = (colorValue: string): string => {
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
  };

  protected readonly expanders = viewChildren(TuiTableExpand);
  protected readonly allExpanded = signal(false);

  protected toggleAllExpanded() {
    this.allExpanded.update((v) => !v);
    const expandState = this.allExpanded();
    for (const exp of this.expanders()) {
      if (exp.expanded() !== expandState) {
        exp.expanded.set(expandState);
      }
    }
  }

  protected currentDirection: TuiSortDirection = 1;
  protected currentSorter: TuiComparator<IndoorRouteWithExtras> = (_a, _b) => 0;

  protected readonly sorters: Record<
    string,
    TuiComparator<IndoorRouteWithExtras>
  > = {
    grade: (a, b) => (a.grade || 0) - (b.grade || 0),
    route: (a, b) => (a.name || '').localeCompare(b.name || ''),
    color: (a, b) => {
      const aName = this.getColorName(a.color || '');
      const bName = this.getColorName(b.color || '');
      return aName.localeCompare(bName);
    },
  };

  protected getSorter(
    col: string,
  ): TuiComparator<IndoorRouteWithExtras> | null {
    if (
      col === 'actions' ||
      col === 'admin_actions' ||
      col === 'expand' ||
      col === 'equippers'
    )
      return null;
    return this.sorters[col] ?? null;
  }

  protected onSortChange(
    sort: TuiTableSortChange<IndoorRouteWithExtras>,
  ): void {
    this.currentSorter = sort.sortComparator || ((_a, _b) => 0);
    this.currentDirection = sort.sortDirection;
  }

  async logAscent(route: IndoorRouteWithExtras | RouteItem): Promise<void> {
    const r = route as IndoorRouteWithExtras;
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as any,
        grade: r.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      if (this.centerId()) {
        this.routesResource.reload();
      }
    }
  }

  protected getAscentBackground(type: string | null): string {
    const info = (this.ascentsService.ascentInfo() as any)[type || 'default'];
    return info?.backgroundSubtle ?? '';
  }

  async editAscent(
    route: IndoorRouteWithExtras | RouteItem,
    ascent: RouteAscentWithExtras | { id: string; type: AscentType | null },
  ): Promise<void> {
    const r = route as IndoorRouteWithExtras;
    const asc = ascent as { id: string; type: AscentType | null };
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: {
          ...asc,
          route: {
            id: r.id,
            name: r.name,
            climbing_kind: r.climbing_kind,
            grade: r.grade,
            center_name: r.center_name,
            center_slug: r.center_slug,
          },
        } as any,
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as any,
        grade: r.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success && this.centerId()) {
      this.routesResource.reload();
    }
  }
}
