import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  PLATFORM_ID,
  Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TuiButton, TuiHint, TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  CLIMBING_ICONS,
  ClimbingKind,
  RouteAscentWithExtras,
  RouteWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import {
  AscentsService,
  GlobalData,
  RoutesService,
  ToastService,
} from '../services';

import { handleErrorToast } from '../utils';

import { AvatarGradeComponent } from './avatar-grade';
import { EmptyStateComponent } from './empty-state';

export type RoutesTableKey =
  | 'grade'
  | 'climbing_kind'
  | 'route'
  | 'rating'
  | 'ascents'
  | 'height';
export type RouteItem = RouteWithExtras;

export interface RoutesTableRow {
  key: string;
  grade: string;
  climbing_kind: ClimbingKind;
  route: string;
  height: number | null;
  rating: number;
  ascents: number;
  liked: boolean;
  project: boolean;
  climbed: boolean;
  link: string[];
  area_name?: string;
  crag_name?: string;
  area_slug?: string;
  crag_slug?: string;
  _ref: RouteItem;
}

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    RouterLink,
    TuiAvatar,
    TuiRating,
    TranslatePipe,
    TuiTable,
    TuiCell,
    FormsModule,
    TuiButton,
    TuiHint,
    TuiTableSortPipe,
    TuiIcon,
    TuiLink,
    AvatarGradeComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="overflow-auto">
      <table
        tuiTable
        class="w-full"
        [columns]="columns()"
        [direction]="currentDirection"
        [sorter]="currentSorter"
        (sortChange)="onSortChange($event)"
      >
        <thead tuiThead>
          <tr tuiThGroup>
            @for (col of columns(); track col) {
              <th *tuiHead="col" tuiTh [sorter]="getSorter(col)">
                <div>
                  {{
                    col === 'actions' || col === 'admin_actions'
                      ? ''
                      : ('labels.' + col | translate)
                  }}
                </div>
              </th>
            }
          </tr>
        </thead>
        @let sortedData = tableData() | tuiTableSort;
        <tbody tuiTbody [data]="sortedData">
          @for (item of sortedData; track item.key) {
            <tr
              tuiTr
              class="cursor-pointer"
              [style.background]="
                showRowColors()
                  ? item.climbed
                    ? ascentsService.ascentInfo()[
                        item._ref.own_ascent?.type || 'default'
                      ].backgroundSubtle
                    : item.project
                      ? 'var(--tui-status-info-pale)'
                      : ''
                  : ''
              "
              (click.zoneless)="router.navigate(item.link)"
            >
              @for (col of columns(); track col) {
                <td *tuiCell="col" tuiTd>
                  @switch (col) {
                    @case ('grade') {
                      <div tuiCell size="m">
                        <app-avatar-grade [grade]="item._ref.grade" size="m" />
                      </div>
                    }
                    @case ('climbing_kind') {
                      <div tuiCell size="m">
                        <tui-avatar
                          size="s"
                          appearance="primary-grayscale"
                          [src]="
                            climbingIcons[item.climbing_kind] || '@tui.mountain'
                          "
                          [tuiHint]="
                            global.isMobile()
                              ? null
                              : ('filters.types.' + item.climbing_kind
                                | translate)
                          "
                        />
                      </div>
                    }
                    @case ('route') {
                      <div tuiCell size="m">
                        <div class="flex flex-col">
                          <a
                            tuiLink
                            [routerLink]="item.link"
                            [style.color]="
                              item.liked ? 'var(--tui-status-negative)' : ''
                            "
                            class="align-self-start whitespace-nowrap font-bold text-base"
                            (click)="$event.stopPropagation()"
                          >
                            {{ item.route || ('labels.route' | translate) }}
                          </a>
                          @if (showLocation()) {
                            <div
                              class="text-xs opacity-70 flex gap-1 items-center whitespace-nowrap"
                            >
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
                                [routerLink]="[
                                  '/area',
                                  item.area_slug,
                                  item.crag_slug,
                                ]"
                                (click)="$event.stopPropagation()"
                              >
                                {{ item.crag_name }}
                              </a>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    @case ('height') {
                      <div tuiCell size="m">
                        {{ item.height ? item.height + 'm' : '-' }}
                      </div>
                    }
                    @case ('rating') {
                      <div tuiCell size="m">
                        <tui-rating
                          [max]="5"
                          [ngModel]="item.rating"
                          [readOnly]="true"
                          [style.font-size.rem]="0.5"
                        />
                      </div>
                    }
                    @case ('ascents') {
                      <div tuiCell size="m">
                        <span>{{ item.ascents }}</span>
                      </div>
                    }
                    @case ('actions') {
                      <div tuiCell size="m">
                        @if (!item.climbed) {
                          <button
                            size="m"
                            appearance="neutral"
                            iconStart="@tui.circle-plus"
                            tuiIconButton
                            type="button"
                            class="!rounded-full"
                            [tuiHint]="
                              global.isMobile()
                                ? null
                                : ('ascent.new' | translate)
                            "
                            (click.zoneless)="
                              onLogAscent(item._ref); $event.stopPropagation()
                            "
                          >
                            {{ 'ascent.new' | translate }}
                          </button>
                        } @else if (item._ref.own_ascent; as ascentToEdit) {
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
                              onEditAscent(ascentToEdit, item._ref.name);
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
                            size="m"
                            [appearance]="item.project ? 'primary' : 'neutral'"
                            iconStart="@tui.bookmark"
                            tuiIconButton
                            type="button"
                            class="!rounded-full"
                            [tuiHint]="
                              global.isMobile()
                                ? null
                                : ((item.project
                                    ? 'actions.project.remove'
                                    : 'actions.project.add'
                                  ) | translate)
                            "
                            (click.zoneless)="
                              onToggleProject(item); $event.stopPropagation()
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
                      <div tuiCell size="m">
                        <button
                          size="s"
                          appearance="neutral"
                          iconStart="@tui.square-pen"
                          tuiIconButton
                          type="button"
                          class="!rounded-full"
                          [tuiHint]="
                            global.isMobile()
                              ? null
                              : ('actions.edit' | translate)
                          "
                          (click.zoneless)="
                            openEditRoute(item._ref); $event.stopPropagation()
                          "
                        >
                          {{ 'actions.edit' | translate }}
                        </button>
                        <button
                          size="s"
                          appearance="negative"
                          iconStart="@tui.trash"
                          tuiIconButton
                          type="button"
                          class="!rounded-full"
                          [tuiHint]="
                            global.isMobile()
                              ? null
                              : ('actions.delete' | translate)
                          "
                          (click.zoneless)="
                            deleteRoute(item._ref); $event.stopPropagation()
                          "
                        >
                          {{ 'actions.delete' | translate }}
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesTableComponent {
  protected readonly router = inject(Router);
  protected readonly ascentsService = inject(AscentsService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);
  private readonly routesService = inject(RoutesService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  // Inputs
  data: InputSignal<RouteItem[]> = input.required<RouteItem[]>();
  direction: InputSignal<TuiSortDirection> = input<TuiSortDirection>(
    TuiSortDirection.Desc,
  );
  showAdminActions: InputSignal<boolean> = input(true);
  showRowColors: InputSignal<boolean> = input(true);

  showLocation: InputSignal<boolean> = input(false);

  // Output to request more items when reaching the end
  toggleLike: OutputEmitterRef<RouteItem> = output<RouteItem>();
  toggleProject: OutputEmitterRef<RouteItem> = output<RouteItem>();

  readonly climbingIcons = CLIMBING_ICONS;

  protected readonly sorters: Record<
    RoutesTableKey,
    TuiComparator<RoutesTableRow>
  > = {
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    climbing_kind: (a, b) => tuiDefaultSort(a.climbing_kind, b.climbing_kind),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
  };

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters['ascents'];
  protected currentDirection: TuiSortDirection = TuiSortDirection.Desc;

  constructor() {
    effect(() => {
      this.currentDirection = this.direction();
    });
  }

  protected readonly columns = computed(() => {
    let cols = ['grade', 'route', 'height', 'rating', 'ascents', 'actions'];
    if (this.global.isMobile()) {
      cols = cols.filter((col) => col !== 'height' && col !== 'rating');
    }
    if (this.global.isAdmin() && this.showAdminActions()) {
      cols.push('admin_actions');
    }
    return cols;
  });

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map((r: RouteItem) => {
      // Map numeric grade from Supabase using label mapping
      const grade =
        VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES] ?? '?';

      const rating = r.rating || 0;
      const ascents = r.ascent_count || 0;

      const liked = r.liked;
      const project = r.project;

      const key = r.id.toString();

      return {
        key,
        grade,
        climbing_kind: r.climbing_kind,
        route: r.name,
        area_name: r.area_name,
        crag_name: r.crag_name,
        area_slug: r.area_slug,
        crag_slug: r.crag_slug,
        height: r.height || null,
        rating,
        ascents,
        liked,
        project,
        climbed: r.climbed ?? false,
        link: [
          '/area',
          r.area_slug || 'unknown',
          r.crag_slug || 'unknown',
          r.slug,
        ],
        _ref: r,
      };
    }),
  );

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected onSortChange(sort: TuiTableSortChange<RoutesTableRow>): void {
    this.currentSorter = sort.sortComparator || this.sorters['ascents'];
    this.currentDirection = sort.sortDirection;
  }

  protected onToggleProject(item: RoutesTableRow): void {
    void this.routesService.toggleRouteProject(item._ref.id);
    this.toggleProject.emit(item._ref);
  }

  protected onLogAscent(item: RouteItem): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: item.id,
        routeName: item.name,
        grade: item.grade,
      }),
    );
  }

  protected onEditAscent(
    ascent: RouteAscentWithExtras,
    routeName: string,
  ): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName: routeName,
        ascentData: ascent,
      }),
    );
  }

  protected deleteRoute(route: RouteItem): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: route.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(route.id)
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  protected openEditRoute(route: RouteItem): void {
    this.routesService.openRouteForm({
      cragId: route.crag_id,
      routeData: {
        id: route.id,
        crag_id: route.crag_id,
        name: route.name,
        slug: route.slug,
        grade: Number(route.grade),
        climbing_kind: route.climbing_kind,
        height: route.height || null,
      },
    });
  }
}
