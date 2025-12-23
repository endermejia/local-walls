import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OutputEmitterRef,
  PLATFORM_ID,
  Signal,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  TuiAvatar,
  TuiRating,
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiToastService,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TuiTable,
  TuiSortDirection,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GlobalData, RoutesService } from '../services';
import { handleErrorToast } from '../utils';
import { RouteFormComponent } from '../pages/route-form';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AvatarGradeComponent } from './avatar-grade';
import {
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  RouteWithExtras,
  RouteAscentDto,
  ClimbingKinds,
} from '../models';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiHint, TuiIcon, TuiLink } from '@taiga-ui/core';

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
  climbing_kind: string;
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
  ],
  template: `
    <div class="overflow-auto">
      <table
        tuiTable
        class="w-full"
        [columns]="columns()"
        [direction]="direction()"
        [sorter]="tableSorter"
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
            <tr tuiTr>
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
                            climbingIcons()[item.climbing_kind] ||
                            '@tui.mountain'
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
                            class="font-medium align-self-start whitespace-nowrap"
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
                            (click.zoneless)="onLogAscent(item._ref)"
                          >
                            {{ 'ascent.new' | translate }}
                          </button>
                        } @else if (item._ref.own_ascent; as ascentToEdit) {
                          <tui-avatar
                            class="cursor-pointer !text-white"
                            [style.background]="
                              ascentInfo()[ascentToEdit?.type || 'default']
                                .background
                            "
                            [tuiHint]="
                              global.isMobile()
                                ? null
                                : ('ascent.edit' | translate)
                            "
                            (click.zoneless)="onEditAscent(ascentToEdit)"
                          >
                            <tui-icon
                              [icon]="
                                ascentInfo()[ascentToEdit?.type || 'default']
                                  .icon
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
                          (click.zoneless)="openEditRoute(item._ref)"
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
                          (click.zoneless)="deleteRoute(item._ref)"
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
              <td [attr.colspan]="columns().length" tuiTd class="!py-10">
                <div
                  class="flex flex-col items-center justify-center gap-2 opacity-50"
                >
                  <tui-icon icon="@tui.package-open" class="text-4xl" />
                  <p>{{ 'labels.empty' | translate }}</p>
                </div>
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
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);
  private readonly routesService = inject(RoutesService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(TuiToastService);

  // Inputs
  data: InputSignal<RouteItem[]> = input.required<RouteItem[]>();
  direction: InputSignal<TuiSortDirection> = input<TuiSortDirection>(
    TuiSortDirection.Desc,
  );
  showAdminActions: InputSignal<boolean> = input(true);

  showLocation: InputSignal<boolean> = input(false);

  // Output to request more items when reaching the end
  toggleLike: OutputEmitterRef<RouteItem> = output<RouteItem>();
  toggleProject: OutputEmitterRef<RouteItem> = output<RouteItem>();
  logAscent: OutputEmitterRef<RouteItem> = output<RouteItem>();
  editAscent: OutputEmitterRef<RouteAscentDto> = output<RouteAscentDto>();

  protected readonly columns = computed(() => {
    const cols = ['grade', 'route', 'height', 'rating', 'ascents', 'actions'];
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

  protected readonly climbingIcons = computed(() => ({
    [ClimbingKinds.SPORT]: '@tui.line-squiggle',
    [ClimbingKinds.BOULDER]: '@tui.biceps-flexed',
    [ClimbingKinds.MIXED]: '@tui.mountain',
    [ClimbingKinds.MULTIPITCH]: '@tui.mountain',
    [ClimbingKinds.TRAD]: '@tui.mountain',
  }));

  protected get tableSorter(): TuiComparator<RoutesTableRow> {
    return this.sorters['ascents'];
  }

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

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected onToggleProject(item: RoutesTableRow): void {
    void this.routesService.toggleRouteProject(item._ref.id);
    this.toggleProject.emit(item._ref);
  }

  protected onLogAscent(item: RouteItem): void {
    this.logAscent.emit(item);
  }

  protected onEditAscent(ascent: RouteAscentDto): void {
    this.editAscent.emit(ascent);
  }

  protected readonly ascentInfo = computed<
    Record<string, { icon: string; background: string }>
  >(() => ({
    os: {
      icon: '@tui.eye',
      background: 'var(--tui-status-positive)',
    },
    f: {
      icon: '@tui.zap',
      background: 'var(--tui-status-warning)',
    },
    rp: {
      icon: '@tui.circle',
      background: 'var(--tui-status-negative)',
    },
    default: {
      icon: '@tui.circle',
      background: 'var(--tui-neutral-fill)',
    },
  }));

  protected deleteRoute(route: RouteItem): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: route.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.routesService
          .delete(route.id)
          .catch((err) => handleErrorToast(err, this.toast, this.translate));
      });
  }

  protected openEditRoute(route: RouteItem): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(RouteFormComponent), {
        label: this.translate.instant('routes.editTitle'),
        size: 'l',
        data: {
          cragId: route.crag_id,
          routeData: {
            id: route.id,
            crag_id: route.crag_id,
            name: route.name,
            slug: route.slug,
            grade: route.grade,
            climbing_kind: route.climbing_kind,
            height: route.height,
          },
        },
      })
      .subscribe();
  }
}
