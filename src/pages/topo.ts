import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
  input,
  effect,
  InputSignal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiButton,
  TuiHint,
  TuiLoader,
  TuiLink,
  TuiIcon,
} from '@taiga-ui/core';
import {
  TuiTable,
  TuiSortDirection,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TuiToastService,
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiAvatar,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  AvatarGradeComponent,
  EmptyStateComponent,
  SectionHeaderComponent,
} from '../components';
import {
  GlobalData,
  RoutesService,
  ToposService,
  AscentsService,
} from '../services';
import {
  TopoDetail,
  TopoRouteWithRoute,
  RouteAscentWithExtras,
} from '../models';
import TopoFormComponent from './topo-form';
import TopoRouteFormComponent from './topo-route-form';
import { handleErrorToast } from '../utils';
import { TuiCell } from '@taiga-ui/layout';

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
  standalone: true,
  imports: [
    EmptyStateComponent,
    TranslatePipe,
    SectionHeaderComponent,
    TuiButton,
    TuiHint,
    TuiTable,
    TuiLoader,
    TuiLink,
    AvatarGradeComponent,
    TuiTableSortPipe,
    RouterLink,
    TuiIcon,
    TuiAvatar,
    TuiCell,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full max-w-5xl mx-auto p-4">
        @if (topo(); as t) {
          <div class="flex flex-wrap items-center justify-between gap-2">
            <app-section-header
              class="grow"
              [title]="t.name"
              [showLike]="false"
            >
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
            </app-section-header>

            <div class="flex flex-wrap gap-2 items-center">
              @if (global.isAdmin()) {
                <div class="flex gap-1">
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="pointer-events-auto !rounded-full"
                    (click.zoneless)="openEditTopo(t)"
                    [tuiHint]="
                      global.isMobile() ? null : ('actions.edit' | translate)
                    "
                  >
                    {{ 'actions.edit' | translate }}
                  </button>
                  <button
                    tuiIconButton
                    size="s"
                    appearance="negative"
                    iconStart="@tui.trash"
                    class="pointer-events-auto !rounded-full"
                    (click.zoneless)="deleteTopo(t)"
                    [tuiHint]="
                      global.isMobile() ? null : ('actions.delete' | translate)
                    "
                  >
                    {{ 'actions.delete' | translate }}
                  </button>
                </div>
              }
              <!-- Toggle image fit button -->
              @let imgFit = imageFit();
              <button
                tuiIconButton
                size="s"
                appearance="primary-grayscale"
                class="pointer-events-auto !rounded-full"
                [iconStart]="
                  imgFit === 'cover'
                    ? '@tui.unfold-horizontal'
                    : '@tui.unfold-vertical'
                "
                [tuiHint]="
                  global.isMobile()
                    ? null
                    : ((imgFit === 'cover'
                        ? 'actions.fit.contain'
                        : 'actions.fit.cover'
                      ) | translate)
                "
                (click.zoneless)="toggleImageFit()"
              >
                Toggle image fit
              </button>
            </div>
          </div>

          <div
            class="relative w-full aspect-video mt-4 overflow-hidden rounded shadow-lg bg-black/10"
          >
            <img
              [src]="t.photo || global.iconSrc()('topo')"
              [alt]="t.name"
              [class]="'w-full h-full ' + topoPhotoClass()"
              decoding="async"
            />
          </div>

          <div class="mt-6 overflow-auto">
            <table
              tuiTable
              class="w-full"
              [columns]="columns()"
              [direction]="direction()"
              [sorter]="tableSorter"
            >
              <thead>
                <tr tuiThGroup>
                  @for (col of columns(); track col) {
                    <th
                      *tuiHead="col"
                      tuiTh
                      [sorter]="getSorter(col)"
                      [class.text-center]="col !== 'name'"
                      [class.!w-12]="col === 'index'"
                      [class.!w-20]="col === 'grade'"
                      [class.!w-24]="
                        col === 'height' ||
                        col === 'actions' ||
                        col === 'admin_actions'
                      "
                    >
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
                    </th>
                  }
                </tr>
              </thead>
              @let sortedData = tableData() | tuiTableSort;
              <tbody tuiTbody [data]="sortedData">
                @for (item of sortedData; track item._ref.route_id) {
                  <tr tuiTr>
                    @for (col of columns(); track col) {
                      <td
                        *tuiCell="col"
                        tuiTd
                        [class.text-center]="col !== 'name'"
                      >
                        @switch (col) {
                          @case ('index') {
                            <div tuiCell size="m">
                              {{ item.index + 1 }}
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
                              <app-avatar-grade [grade]="item.grade" size="s" />
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
                                    global.isMobile()
                                      ? null
                                      : ('ascent.new' | translate)
                                  "
                                  (click.zoneless)="onLogAscent(item._ref)"
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
                                    global.isMobile()
                                      ? null
                                      : ('ascent.edit' | translate)
                                  "
                                  (click.zoneless)="
                                    onEditAscent(ascentToEdit, item.name)
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
                                    global.isMobile()
                                      ? null
                                      : ((item.project
                                          ? 'actions.project.remove'
                                          : 'actions.project.add'
                                        ) | translate)
                                  "
                                  (click.zoneless)="onToggleProject(item)"
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
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                class="!rounded-full"
                                [tuiHint]="
                                  global.isMobile()
                                    ? null
                                    : ('actions.edit' | translate)
                                "
                                (click.zoneless)="openEditTopoRoute(item._ref)"
                              >
                                {{ 'actions.edit' | translate }}
                              </button>
                              <button
                                tuiIconButton
                                size="s"
                                appearance="negative"
                                iconStart="@tui.unlink"
                                class="!rounded-full"
                                [tuiHint]="
                                  global.isMobile()
                                    ? null
                                    : ('actions.unlink' | translate)
                                "
                                (click.zoneless)="deleteTopoRoute(item._ref)"
                              >
                                {{ 'actions.unlink' | translate }}
                              </button>
                            </div>
                          }
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr tuiTr>
                    <td [attr.colspan]="columns().length" tuiTd>
                      <app-empty-state />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
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
  },
})
export class TopoComponent {
  protected readonly imageFit: WritableSignal<'cover' | 'contain'> =
    signal('cover');
  protected readonly topoPhotoClass: Signal<'object-cover' | 'object-contain'> =
    computed(() =>
      this.imageFit() === 'cover' ? 'object-cover' : 'object-contain',
    );

  protected readonly global = inject(GlobalData);
  private readonly topos = inject(ToposService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(TuiToastService);

  // Route params
  countrySlug: InputSignal<string> = input.required();
  areaSlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  protected readonly topo = this.global.topoDetailResource.value;

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
    const base = ['index', 'grade', 'name', 'height', 'actions'];
    if (this.global.isAdmin()) {
      base.push('admin_actions');
    }
    return base;
  });
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);

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

  protected get tableSorter(): TuiComparator<TopoRouteRow> {
    return this.sorters['index'];
  }

  protected getSorter(col: string): TuiComparator<TopoRouteRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    return this.sorters[col] ?? null;
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
    this.ascentsService
      .openAscentForm({
        routeId: route.id,
        routeName: route.name,
        grade: route.grade,
      })
      .subscribe();
  }

  protected onEditAscent(
    ascent: RouteAscentWithExtras,
    routeName?: string,
  ): void {
    this.ascentsService
      .openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
      })
      .subscribe();
  }

  protected onToggleProject(item: TopoRouteRow): void {
    void this.routesService.toggleRouteProject(item._ref.route_id).then(() => {
      void this.global.topoDetailResource.reload();
    });
    item.project = !item.project;
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }

  openEditTopo(topo: TopoDetail): void {
    const initialRouteIds = topo.topo_routes.map((tr) => tr.route_id);
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(TopoFormComponent), {
        label: this.translate.instant('topos.editTitle'),
        size: 'l',
        data: {
          topoData: topo,
          initialRouteIds,
        },
      })
      .subscribe();
  }

  openEditTopoRoute(topoRoute: TopoRouteWithRoute): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(TopoRouteFormComponent), {
        label: this.translate.instant('topos.editRouteTitle'),
        size: 's',
        data: {
          topoRouteData: topoRoute,
        },
      })
      .subscribe((reloaded) => {
        if (reloaded) {
          // The service already calls reload on topoDetailResource
        }
      });
  }

  deleteTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.topos
          .delete(topo.id)
          .then(() => {
            this.router.navigate(['/area', this.areaSlug(), this.cragSlug()]);
          })
          .catch((err) => handleErrorToast(err, this.toast, this.translate));
      });
  }

  deleteTopoRoute(topoRoute: TopoRouteWithRoute): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.removeRouteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.removeRouteConfirm', {
            name: topoRoute.route.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.topos
          .removeRoute(topoRoute.topo_id, topoRoute.route_id)
          .then(() => {
            void this.global.topoDetailResource.reload();
          })
          .catch((err) => handleErrorToast(err, this.toast, this.translate));
      });
  }
}
