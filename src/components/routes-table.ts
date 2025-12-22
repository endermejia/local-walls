import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InputSignal,
  OnDestroy,
  OutputEmitterRef,
  PLATFORM_ID,
  Signal,
  ViewChild,
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
import {
  ClimbingRoute,
  ORDERED_GRADE_VALUES,
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  RouteDto,
} from '../models';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiHint } from '@taiga-ui/core';

export type RoutesTableKey = 'grade' | 'route' | 'rating' | 'ascents';
export type RouteItem = ClimbingRoute | RouteDto;

export interface RoutesTableRow {
  key: string;
  grade: string;
  route: string;
  rating: number;
  ascents: number;
  liked: boolean;
  project: boolean;
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
  ],
  template: `
    <div class="overflow-auto" #scroller>
      <table
        tuiTable
        class="w-full"
        [columns]="columns"
        [direction]="direction()"
        [sorter]="tableSorter"
      >
        <thead tuiThead>
          <tr tuiThGroup>
            @for (col of columns; track col) {
              <th *tuiHead="col" tuiTh [sorter]="getSorter(col)">
                <div>
                  {{ 'labels.' + col | translate }}
                </div>
              </th>
            }
          </tr>
        </thead>
        @let sortedData = tableData() | tuiTableSort;
        <tbody tuiTbody [data]="sortedData">
          @for (item of sortedData; track item.key) {
            <tr tuiTr>
              @for (col of columns; track col) {
                <td *tuiCell="col" tuiTd>
                  @switch (col) {
                    @case ('grade') {
                      <div tuiCell size="m">
                        <tui-avatar
                          tuiThumbnail
                          size="l"
                          class="self-center font-semibold select-none"
                          [attr.aria-label]="'labels.grade' | translate"
                        >
                          {{ item.grade }}
                        </tui-avatar>
                      </div>
                    }
                    @case ('route') {
                      <div tuiCell size="m">
                        <a
                          [routerLink]="getRouteLink(item._ref)"
                          class="tui-link"
                        >
                          {{ item.route || ('labels.route' | translate) }}
                        </a>
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
                      <div tuiCell size="m" class="flex items-center gap-2">
                        <button
                          size="s"
                          [appearance]="item.liked ? 'accent' : 'neutral'"
                          iconStart="@tui.heart"
                          tuiIconButton
                          type="button"
                          class="!rounded-full"
                          [tuiHint]="
                            (item.liked
                              ? 'actions.favorite.remove'
                              : 'actions.favorite.add'
                            ) | translate
                          "
                          (click.zoneless)="onToggleLike(item)"
                        >
                          {{
                            (item.liked
                              ? 'actions.favorite.remove'
                              : 'actions.favorite.add'
                            ) | translate
                          }}
                        </button>

                        <button
                          size="s"
                          [appearance]="item.project ? 'primary' : 'neutral'"
                          iconStart="@tui.bookmark"
                          tuiIconButton
                          type="button"
                          class="!rounded-full"
                          [tuiHint]="
                            (item.project
                              ? 'actions.project.remove'
                              : 'actions.project.add'
                            ) | translate
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

                        @if (global.isAdmin() && 'id' in item._ref) {
                          <button
                            size="s"
                            appearance="neutral"
                            iconStart="@tui.square-pen"
                            tuiIconButton
                            type="button"
                            class="!rounded-full"
                            [tuiHint]="'actions.edit' | translate"
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
                            [tuiHint]="'actions.delete' | translate"
                            (click.zoneless)="deleteRoute(item._ref)"
                          >
                            {{ 'actions.delete' | translate }}
                          </button>
                        }
                      </div>
                    }
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
      <!-- Sentinel for infinite scroll -->
      <div #sentinel class="h-6 w-full"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesTableComponent implements AfterViewInit, OnDestroy {
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
  loading: InputSignal<boolean> = input(false);
  hasNext: InputSignal<boolean> = input(false);

  // Output to request more items when reaching the end
  loadMore: OutputEmitterRef<void> = output<void>();

  @ViewChild('sentinel', { read: ElementRef })
  private sentinelRef?: ElementRef<HTMLElement>;
  @ViewChild('scroller', { read: ElementRef })
  private scrollerRef?: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;

  protected readonly columns: string[] = [
    'grade',
    'route',
    'rating',
    'ascents',
    'actions',
  ];

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map((r: RouteItem) => {
      // Handle ClimbingRoute (VerticalLife) vs RouteDto (Supabase)
      let grade = '';
      if ('difficulty' in r) {
        grade = r.difficulty || '';
      } else if ('grade' in r) {
        // Map numeric grade from Supabase using label mapping
        grade = VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES] ?? '?';
      }

      let name = '';
      if ('zlaggableName' in r) {
        name = r.zlaggableName;
      } else if ('name' in r) {
        name = r.name;
      }

      const rating = 'averageRating' in r ? (r.averageRating ?? 0) : 0;
      const ascents = 'totalAscents' in r ? (r.totalAscents ?? 0) : 0;

      const liked = 'liked' in r ? !!r.liked : false;
      const project = 'project' in r ? !!r.project : false;

      let key = '';
      if ('zlaggableId' in r) {
        key = r.zlaggableId.toString();
      } else {
        key = r.id.toString();
      }
      if (!key) key = Math.random().toString();

      return {
        key,
        grade,
        route: name,
        rating,
        ascents,
        liked,
        project,
        _ref: r,
      };
    }),
  );

  protected get tableSorter(): TuiComparator<RoutesTableRow> {
    return this.sorters['ascents'];
  }

  protected getRouteLink(item: RouteItem): (string | undefined)[] {
    const countrySlug =
      'countrySlug' in item
        ? item.countrySlug
        : this.global.crag()?.countrySlug;
    const cragSlug =
      'cragSlug' in item ? item.cragSlug : this.global.crag()?.cragSlug;
    const sectorSlug = 'sectorSlug' in item ? item.sectorSlug : 'unknown';
    const routeSlug = 'zlaggableSlug' in item ? item.zlaggableSlug : item.slug;

    return ['/route', countrySlug, cragSlug, 'sector', sectorSlug, routeSlug];
  }

  protected readonly sorters: Record<
    RoutesTableKey,
    TuiComparator<RoutesTableRow>
  > = {
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
  };

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions') return null;
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected onToggleLike(item: RoutesTableRow): void {
    if ('id' in item._ref) {
      void this.routesService.toggleRouteLike(item._ref.id);
    } else if ('zlaggableId' in item._ref) {
      void this.global.toggleLikeRoute(item._ref.zlaggableId);
    }
  }

  protected onToggleProject(item: RoutesTableRow): void {
    if ('id' in item._ref) {
      void this.routesService.toggleRouteProject(item._ref.id);
    } else {
      // Vertical Life project toggle (if available) - typically not exposed as simple RPC
      console.warn('Project toggle not implemented for Vertical Life routes');
    }
  }

  protected deleteRoute(route: RouteItem): void {
    if (!('id' in route)) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: 'name' in route ? route.name : '',
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
    if (!('id' in route)) return;
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

  ngAfterViewInit(): void {
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.teardownObserver();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  private setupObserver(): void {
    if (!this.isBrowser()) return;
    const sentinel = this.sentinelRef?.nativeElement;
    if (!sentinel) return;

    // If there is an existing observer, disconnect it
    this.teardownObserver();

    const root = this.scrollerRef?.nativeElement ?? null;
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        // Only emit if not loading and there are more pages
        if (this.loading() || !this.hasNext()) return;
        this.loadMore.emit();
      },
      { root, threshold: 0.1 },
    );
    this.observer.observe(sentinel);
  }

  private teardownObserver(): void {
    try {
      this.observer?.disconnect();
    } catch {
      // ignore
    }
    this.observer = undefined;
  }
}
