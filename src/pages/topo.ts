import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  signal,
  Signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort, TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDataList,
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiInputNumber,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  RouteAscentWithExtras,
  RouteWithExtras,
  TopoDetail,
  TopoRouteWithRoute,
} from '../models';

import {
  AscentsService,
  GlobalData,
  RoutesService,
  ToastService,
  ToposService,
} from '../services';

import { TopoImagePipe } from '../pipes';

import { AvatarGradeComponent } from '../components/avatar-grade';
import { EmptyStateComponent } from '../components/empty-state';
import { SectionHeaderComponent } from '../components/section-header';

import { handleErrorToast } from '../utils';

export interface TopoRouteRow {
  index: number;
  name: string;
  grade: number;
  height: number | null;
  slug: string;
  link: string[];
  climbed: boolean;
  project: boolean;
  _ref: TopoRouteWithRoute;
}

@Component({
  selector: 'app-topo',
  imports: [
    AsyncPipe,
    AvatarGradeComponent,
    EmptyStateComponent,
    FormsModule,
    RouterLink,
    SectionHeaderComponent,
    TopoImagePipe,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiDataList,
    TuiHint,
    TuiIcon,
    TuiInputNumber,
    TuiLink,
    TuiLoader,
    TuiScrollbar,
    TuiSwipe,
    TuiTable,
    TuiTableSortPipe,
    TuiTextfield,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full max-w-7xl mx-auto p-4">
        @let isAdmin = global.isAdmin();
        @let isMobile = global.isMobile();
        @if (topo(); as t) {
          @let isEquipper = global.isAllowedEquipper(crag()?.area_id);
          <div class="mb-4">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
            >
              <!-- Shade info as title additional info -->
              <ng-container titleInfo>
                @if (shadeInfo(); as info) {
                  @let changeAt = 'filters.shade.changeAt' | translate;
                  @let hint =
                    (info.label | translate) +
                    (topo()?.shade_change_hour
                      ? ' · ' + changeAt + ' ' + topo()?.shade_change_hour
                      : '');
                  <tui-icon
                    [icon]="info.icon"
                    class="text-2xl opacity-70"
                    [tuiHint]="hint"
                  />
                }
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>

              <!-- Admin and utility action buttons -->
              <div actionButtons class="flex gap-2">
                @if (isAdmin || isEquipper) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="!rounded-full"
                    (click.zoneless)="openEditTopo(t)"
                    [tuiHint]="isMobile ? null : ('actions.edit' | translate)"
                  >
                    {{ 'actions.edit' | translate }}
                  </button>
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.upload"
                    class="!rounded-full"
                    (click.zoneless)="fileInput.click()"
                    [tuiHint]="
                      isMobile ? null : ('actions.uploadPhoto' | translate)
                    "
                  >
                    {{ 'actions.uploadPhoto' | translate }}
                  </button>
                  <input
                    #fileInput
                    type="file"
                    class="hidden"
                    accept="image/*"
                    (change)="onFileSelected($event)"
                  />
                  @if (isAdmin) {
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="!rounded-full"
                      (click.zoneless)="deleteTopo(t)"
                      [tuiHint]="
                        isMobile ? null : ('actions.delete' | translate)
                      "
                    >
                      {{ 'actions.delete' | translate }}
                    </button>
                  }
                }
              </div>
            </app-section-header>
          </div>

          <div
            class="flex flex-col md:flex-row w-full h-full gap-4 overflow-hidden"
          >
            <!-- Topo image container -->
            @let imageUrl = topoImageUrl();
            @let topoImage = imageUrl | topoImage | async;
            <div
              (tuiSwipe)="onSwipe($event)"
              [style.height]="isMobile ? '50%' : '100%'"
              [style.width]="isMobile ? '100%' : '50%'"
              class="relative w-full bg-[var(--tui-background-neutral-1)] rounded-xl border border-[var(--tui-border-normal)] overflow-x-auto"
            >
              <div
                class="h-full w-max flex items-center justify-center min-w-full"
              >
                <img
                  [src]="topoImage || global.iconSrc()('topo')"
                  [alt]="t.name"
                  class="w-auto h-full max-w-none cursor-pointer block object-cover"
                  decoding="async"
                  tabindex="0"
                  (click.zoneless)="toggleFullscreen(!!topoImage)"
                  (keydown.enter)="toggleFullscreen(!!topoImage)"
                />
              </div>
            </div>
            <!-- Topo fullscreen -->
            @if (isFullscreen()) {
              <div
                class="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden touch-none backdrop-blur-xl"
                tabindex="0"
                (click.zoneless)="toggleFullscreen(false)"
                (keydown.enter)="toggleFullscreen(false)"
                (wheel.zoneless)="onWheel($any($event))"
                (touchstart.zoneless)="onTouchStart($any($event))"
                (touchmove.zoneless)="onTouchMove($any($event))"
                (touchend.zoneless)="onTouchEnd()"
              >
                <img
                  [src]="topoImage || global.iconSrc()('topo')"
                  [alt]="t.name"
                  class="max-w-full max-h-full object-contain transition-transform duration-75 ease-out select-none"
                  [style.transform]="
                    'translate(' +
                    zoomPosition().x +
                    'px, ' +
                    zoomPosition().y +
                    'px) scale(' +
                    zoomScale() +
                    ')'
                  "
                />
              </div>
            }

            <!-- Routes table container -->
            <div
              [style.height]="isMobile ? '50%' : '100%'"
              [style.width]="isMobile ? '100%' : '50%'"
              class="w-full overflow-hidden"
            >
              <tui-scrollbar class="h-full">
                <table
                  tuiTable
                  class="w-full"
                  [class.table-fixed]="isMobile"
                  [columns]="columns()"
                  [direction]="direction()"
                  [sorter]="sorter()"
                  (sortChange)="onSortChange($event)"
                >
                  <thead tuiThead>
                    <tr tuiThGroup>
                      @for (col of columns(); track col) {
                        <th
                          *tuiHead="col"
                          tuiTh
                          [sorter]="getSorter(col)"
                          [class.text-center]="col !== 'name'"
                          [class.!w-10]="isMobile && col === 'index'"
                          [class.!w-12]="
                            (!isMobile && col === 'index') ||
                            (isMobile && col === 'grade')
                          "
                          [class.!w-20]="!isMobile && col === 'grade'"
                          [class.!w-20]="!isMobile && col === 'grade'"
                          [class.!w-24]="
                            (isMobile &&
                              (col === 'actions' || col === 'admin_actions')) ||
                            (!isMobile &&
                              (col === 'height' || col === 'admin_actions'))
                          "
                          [class.!w-28]="!isMobile && col === 'actions'"
                        >
                          <div class="items-center justify-center gap-1">
                            @switch (col) {
                              @case ('index') {
                                #
                              }
                              @case ('name') {
                                {{ 'routes.name' | translate }}
                              }
                              @case ('grade') {
                                {{ 'labels.grade' | translate }}
                              }
                              @case ('height') {
                                {{ 'routes.height' | translate }}
                              }
                            }
                          </div>
                        </th>
                      }
                    </tr>
                  </thead>
                  @let sortedData = tableData() | tuiTableSort;
                  @for (
                    item of sortedData;
                    track item._ref.topo_id + '-' + item._ref.route_id
                  ) {
                    <tbody tuiTbody>
                      <tr
                        tuiTr
                        [style.background]="
                          item.climbed
                            ? ascentsService.ascentInfo()[
                                item._ref.route.own_ascent?.type || 'default'
                              ].backgroundSubtle
                            : item.project
                              ? 'var(--tui-status-info-pale)'
                              : ''
                        "
                        tabindex="0"
                        class="cursor-pointer"
                        (click.zoneless)="router.navigate(item.link)"
                        (keydown.enter)="router.navigate(item.link)"
                      >
                        @for (col of columns(); track col) {
                          <td
                            *tuiCell="col"
                            tuiTd
                            [class.text-center]="col !== 'name'"
                          >
                            @switch (col) {
                              @case ('index') {
                                <div tuiCell size="m" class="justify-center">
                                  @if (isAdmin || isEquipper) {
                                    <tui-textfield
                                      tuiTextfieldSize="s"
                                      [class.!w-16]="!isMobile"
                                      [class.!w-10]="isMobile"
                                      class="!h-8"
                                    >
                                      <input
                                        tuiInputNumber
                                        class="text-center !h-full !border-none !p-0"
                                        [ngModel]="item.index + 1"
                                        (change)="
                                          onUpdateRouteNumber(
                                            item._ref,
                                            $any($event.target).value
                                          )
                                        "
                                      />
                                    </tui-textfield>
                                  } @else {
                                    {{ item.index + 1 }}
                                  }
                                </div>
                              }
                              @case ('name') {
                                <div tuiCell size="m">
                                  <a
                                    tuiLink
                                    [routerLink]="item.link"
                                    class="text-left"
                                  >
                                    {{ item.name }}
                                  </a>
                                </div>
                              }
                              @case ('grade') {
                                <div tuiCell size="m" class="justify-center">
                                  <app-avatar-grade [grade]="item.grade" />
                                </div>
                              }
                              @case ('height') {
                                <div tuiCell size="m">
                                  {{ item.height ? item.height + 'm' : '-' }}
                                </div>
                              }
                              @case ('actions') {
                                <div tuiCell size="m" class="justify-center">
                                  @if (!item.climbed) {
                                    <button
                                      tuiIconButton
                                      size="m"
                                      appearance="neutral"
                                      iconStart="@tui.circle-plus"
                                      class="!rounded-full"
                                      [tuiHint]="
                                        isMobile
                                          ? null
                                          : ('ascent.new' | translate)
                                      "
                                      (click.zoneless)="
                                        onLogAscent(item._ref);
                                        $event.stopPropagation()
                                      "
                                    >
                                      {{ 'ascent.new' | translate }}
                                    </button>
                                  } @else if (
                                    item._ref.route.own_ascent;
                                    as ascentToEdit
                                  ) {
                                    <tui-avatar
                                      class="cursor-pointer !text-white"
                                      [style.background]="
                                        ascentsService.ascentInfo()[
                                          ascentToEdit?.type || 'default'
                                        ].background
                                      "
                                      [tuiHint]="
                                        isMobile
                                          ? null
                                          : ('ascent.edit' | translate)
                                      "
                                      tabindex="0"
                                      (click.zoneless)="
                                        onEditAscent(ascentToEdit, item.name);
                                        $event.stopPropagation()
                                      "
                                      (keydown.enter)="
                                        onEditAscent(ascentToEdit, item.name);
                                        $event.stopPropagation()
                                      "
                                    >
                                      <tui-icon
                                        [icon]="
                                          ascentsService.ascentInfo()[
                                            ascentToEdit?.type || 'default'
                                          ].icon
                                        "
                                      />
                                    </tui-avatar>
                                  }
                                  @if (!item.climbed) {
                                    <button
                                      tuiIconButton
                                      size="m"
                                      [appearance]="
                                        item.project ? 'primary' : 'neutral'
                                      "
                                      iconStart="@tui.bookmark"
                                      class="!rounded-full"
                                      [tuiHint]="
                                        isMobile
                                          ? null
                                          : ((item.project
                                              ? 'actions.project.remove'
                                              : 'actions.project.add'
                                            ) | translate)
                                      "
                                      (click.zoneless)="
                                        onToggleProject(item);
                                        $event.stopPropagation()
                                      "
                                    >
                                      {{
                                        (item.project
                                          ? 'actions.project.remove'
                                          : 'actions.project.add'
                                        ) | translate
                                      }}
                                    </button>
                                  }
                                </div>
                              }
                              @case ('admin_actions') {
                                <div tuiCell size="m" class="justify-center">
                                  <button
                                    tuiIconButton
                                    size="s"
                                    appearance="negative"
                                    iconStart="@tui.unlink"
                                    class="!rounded-full"
                                    [tuiHint]="
                                      isMobile
                                        ? null
                                        : ('actions.unlink' | translate)
                                    "
                                    (click.zoneless)="
                                      deleteTopoRoute(item._ref);
                                      $event.stopPropagation()
                                    "
                                  >
                                    {{ 'actions.unlink' | translate }}
                                  </button>
                                </div>
                              }
                            }
                          </td>
                        }
                      </tr>
                    </tbody>
                  } @empty {
                    <tbody tuiTbody>
                      <tr tuiTr>
                        <td [attr.colspan]="columns().length" tuiTd>
                          <app-empty-state icon="@tui.route" />
                        </td>
                      </tr>
                    </tbody>
                  }
                </table>
              </tui-scrollbar>
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class TopoComponent {
  protected readonly global = inject(GlobalData);
  protected readonly ascentsService = inject(AscentsService);
  private readonly toposService = inject(ToposService);
  protected readonly routesService = inject(RoutesService);
  protected readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  protected readonly isFullscreen = signal(false);
  protected readonly zoomScale = signal(1);
  protected readonly zoomPosition = signal({ x: 0, y: 0 });

  protected toggleFullscreen(value: boolean): void {
    this.isFullscreen.set(value);
    if (!value) {
      this.resetZoom();
    }
  }

  protected resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomPosition.set({ x: 0, y: 0 });
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = -event.deltaY;
    const factor = 0.1;
    const newScale = Math.min(
      Math.max(1, this.zoomScale() + (delta > 0 ? factor : -factor)),
      5,
    );

    if (newScale === 1) {
      this.resetZoom();
    } else {
      this.zoomScale.set(newScale);
    }
  }

  private lastTouchDistance = 0;
  private isPanning = false;
  private lastTouchPos = { x: 0, y: 0 };

  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.lastTouchDistance = this.getTouchDistance(event.touches);
    } else if (event.touches.length === 1 && this.zoomScale() > 1) {
      this.isPanning = true;
      this.lastTouchPos = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  protected onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      const distance = this.getTouchDistance(event.touches);
      const delta = distance - this.lastTouchDistance;
      const factor = 0.01;
      const newScale = Math.min(
        Math.max(1, this.zoomScale() + delta * factor),
        5,
      );

      this.zoomScale.set(newScale);
      this.lastTouchDistance = distance;
      if (newScale === 1) this.resetZoom();
    } else if (event.touches.length === 1 && this.isPanning) {
      event.preventDefault();
      const touch = event.touches[0];
      const dx = touch.clientX - this.lastTouchPos.x;
      const dy = touch.clientY - this.lastTouchPos.y;

      this.zoomPosition.update((pos) => ({
        x: pos.x + dx,
        y: pos.y + dy,
      }));

      this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
    }
  }

  protected onTouchEnd(): void {
    this.isPanning = false;
    this.lastTouchDistance = 0;
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Route params
  countrySlug: InputSignal<string> = input.required();
  areaSlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  protected readonly topo = this.global.topoDetailResource.value;
  protected readonly crag = this.global.cragDetailResource.value;
  protected readonly allAreaTopos = this.global.areaToposResource.value;

  protected readonly sortedAreaTopos = computed(() => {
    const topos = this.allAreaTopos() || [];
    return [...topos].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly topoImageUrl = computed(() => {
    const t = this.topo();
    if (!t) return null;
    return { path: t.photo, version: this.global.topoPhotoVersion() };
  });

  protected readonly currentTopoIndex = computed(() => {
    const topo = this.topo();
    const topos = this.allAreaTopos() || [];
    if (!topo || !topos.length) return -1;
    return topos.findIndex((t) => t.id === topo.id);
  });

  protected readonly prevTopo = computed(() => {
    const i = this.currentTopoIndex();
    const topos = this.allAreaTopos() || [];
    if (!topos.length) return null;
    return topos[(i - 1 + topos.length) % topos.length];
  });

  protected readonly nextTopo = computed(() => {
    const i = this.currentTopoIndex();
    const topos = this.allAreaTopos() || [];
    if (!topos.length) return null;
    return topos[(i + 1) % topos.length];
  });

  protected readonly shadeInfo = computed(() => {
    const t = this.topo();
    if (!t) return null;

    if (t.shade_morning && t.shade_afternoon) {
      return { icon: '@tui.eclipse', label: 'filters.shade.allDay' };
    }
    if (t.shade_morning) {
      return { icon: '@tui.sunset', label: 'filters.shade.morning' };
    }
    if (t.shade_afternoon) {
      return { icon: '@tui.sunrise', label: 'filters.shade.afternoon' };
    }
    return { icon: '@tui.sun', label: 'filters.shade.noShade' };
  });

  protected readonly columns = computed(() => {
    const isMobile = this.global.isMobile();
    const base = isMobile
      ? ['index', 'grade', 'name', 'actions']
      : ['index', 'grade', 'name', 'height', 'actions'];
    const crag = this.crag();
    if (this.global.isAllowedEquipper(crag?.area_id)) {
      base.push('admin_actions');
    }
    return base;
  });

  protected readonly tableData: Signal<TopoRouteRow[]> = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr) => {
      const r = tr.route;
      const climbed = !!r.own_ascent;
      const project = !!r.project;

      return {
        index: tr.number,
        name: tr.route.name,
        grade: tr.route.grade,
        height: tr.route.height || null,
        slug: tr.route.slug,
        link: ['/area', this.areaSlug(), this.cragSlug(), tr.route.slug],
        climbed,
        project,
        _ref: tr,
      };
    });
  });

  protected readonly sorters: Record<string, TuiComparator<TopoRouteRow>> = {
    index: (a, b) => tuiDefaultSort(a.index, b.index),
    name: (a, b) => tuiDefaultSort(a.name, b.name),
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
  };

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<TopoRouteRow>>(
    this.sorters['index'],
  );

  protected getSorter(col: string): TuiComparator<TopoRouteRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    return this.sorters[col] ?? null;
  }

  protected onSortChange(sort: TuiTableSortChange<TopoRouteRow>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.sorters['index']);
  }

  constructor() {
    effect(() => {
      this.global.resetDataByPage('topo');
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const topoId = this.id();
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
      if (topoId) {
        this.global.selectedTopoId.set(topoId);
      }
    });
  }

  protected onLogAscent(tr: TopoRouteWithRoute): void {
    const route = tr.route;
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: route.id,
        routeName: route.name,
        grade: route.grade,
      }),
    );
  }

  protected onEditAscent(
    ascent: RouteAscentWithExtras,
    routeName?: string,
  ): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
      }),
    );
  }

  protected async onToggleProject(item: TopoRouteRow): Promise<void> {
    const routeToSync: RouteWithExtras = {
      ...item._ref.route,
      project: !!item._ref.route.project,
      liked: false,
    };
    await this.routesService.toggleRouteProject(
      item._ref.route_id,
      routeToSync,
    );
  }

  protected onUpdateRouteNumber(
    tr: TopoRouteWithRoute,
    newNumber: number | string | null,
  ): void {
    const val =
      typeof newNumber === 'string' ? parseInt(newNumber, 10) : newNumber;
    if (val === null || isNaN(val) || val === tr.number + 1) return;
    this.toposService
      .updateRouteOrder(tr.topo_id, tr.route_id, val - 1)
      .catch((err) => handleErrorToast(err, this.toast));
  }

  openEditTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const initialRouteIds = topo.topo_routes.map((tr) => tr.route_id);
    this.toposService.openTopoForm({
      cragId: topo.crag_id,
      topoData: topo,
      initialRouteIds,
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const topo = this.topo();
    if (!topo) return;

    this.toposService
      .uploadPhoto(topo.id, file)
      .catch((e) => handleErrorToast(e, this.toast));
  }

  deleteTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.toposService
        .delete(topo.id)
        .then(() =>
          this.router.navigate(['/area', this.areaSlug(), this.cragSlug()]),
        )
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  deleteTopoRoute(topoRoute: TopoRouteWithRoute): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.removeRouteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.removeRouteConfirm', {
            name: topoRoute.route.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.toposService
        .removeRoute(topoRoute.topo_id, topoRoute.route_id)
        .then(() => this.global.topoDetailResource.reload())
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  protected navigateToTopo(topo: { id: number; crag_slug?: string }): void {
    void this.router.navigate([
      '/area',
      this.areaSlug(),
      topo.crag_slug || this.cragSlug(),
      'topo',
      topo.id,
    ]);
  }

  protected onSwipe(event: TuiSwipeEvent): void {
    if (event.direction === 'left') {
      const next = this.nextTopo();
      if (next) this.navigateToTopo(next);
    } else if (event.direction === 'right') {
      const prev = this.prevTopo();
      if (prev) this.navigateToTopo(prev);
    }
  }
}
