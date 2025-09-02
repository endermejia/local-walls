import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { TuiBadge, TuiAvatar } from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { TuiTable, TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TuiLet, tuiDefaultSort } from '@taiga-ui/cdk';
import { GlobalData } from '../services';
import type { Topo, TopoRoute, Route } from '../models';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';

type TableKey = 'grade' | 'number' | 'route' | 'height';

// Row shape for table sorting
export interface Row {
  grade: number;
  number: number;
  route: string;
  height: number | null;
  _ref: TopoRoute & { route?: Route };
}

@Component({
  selector: 'app-topo',
  standalone: true,
  imports: [
    RouterLink,
    TuiBadge,
    TuiAvatar,
    TranslatePipe,
    TuiTable,
    TuiCell,
    TuiLet,
    SectionHeaderComponent,
    TuiBottomSheet,
  ],
  template: `
    <div class="flex flex-col h-full w-full relative">
      @if (topo(); as t) {
        <img
          [src]="t.photo || global.iconSrc()('topo')"
          alt="{{ t.name }}"
          class="absolute inset-0 w-full h-full object-cover"
          decoding="async"
        />

        <tui-bottom-sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-label="Routes"
        >
          <section class="w-full max-w-5xl mx-auto p-4 overflow-auto">
            <app-section-header
              [title]="t.name"
              [liked]="global.isTopoLiked()(t.id)"
              (back)="goBack()"
              (toggleLike)="global.toggleLikeTopo(t.id)"
            />

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
              <tbody
                *tuiLet="tableData() | tuiTableSort as sortedData"
                tuiTbody
                [data]="sortedData"
              >
                @for (item of sortedData; track item._ref.routeId) {
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
                                {{ item._ref.route?.grade || '—' }}
                              </tui-avatar>
                            </div>
                          }
                          @case ('number') {
                            <div tuiCell size="m">
                              <span>{{ item._ref.number }}</span>
                            </div>
                          }
                          @case ('route') {
                            <div tuiCell size="m">
                              <a
                                [routerLink]="['/route', item._ref.routeId]"
                                class="tui-link"
                                >{{
                                  item._ref.route?.name ||
                                    ('labels.route' | translate)
                                }}</a
                              >
                            </div>
                          }
                          @case ('height') {
                            <div tuiCell size="m">
                              <span>{{
                                item._ref.route?.height !== null &&
                                item._ref.route?.height !== undefined
                                  ? item._ref.route?.height + ' m'
                                  : '—'
                              }}</span>
                            </div>
                          }
                          @case ('actions') {
                            <div
                              tuiCell
                              size="m"
                              class="flex items-center gap-2"
                            >
                              @if (item._ref.route?.url_8anu; as url) {
                                <a
                                  [href]="url"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  [attr.aria-label]="'8a.nu'"
                                >
                                  <img
                                    alt="8a.nu"
                                    [src]="global.iconSrc()('8anu')"
                                    tuiBadge
                                    size="l"
                                  />
                                </a>
                              }
                              <tui-badge
                                [appearance]="
                                  global.isRouteLiked()(item._ref.routeId)
                                    ? 'negative'
                                    : 'neutral'
                                "
                                iconStart="@tui.heart"
                                size="xl"
                                (click.zoneless)="
                                  global.toggleLikeRoute(item._ref.routeId)
                                "
                                [attr.aria-label]="
                                  (global.isRouteLiked()(item._ref.routeId)
                                    ? 'actions.favorite.remove'
                                    : 'actions.favorite.add'
                                  ) | translate
                                "
                                [attr.title]="
                                  (global.isRouteLiked()(item._ref.routeId)
                                    ? 'actions.favorite.remove'
                                    : 'actions.favorite.add'
                                  ) | translate
                                "
                              ></tui-badge>
                            </div>
                          }
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </section>
        </tui-bottom-sheet>
      } @else {
        <p>{{ 'common.loading' | translate }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow' },
})
export class TopoComponent {
  protected readonly stops = ['6rem'] as const;
  private readonly route = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  topoId: WritableSignal<string | null> = signal<string | null>(null);
  topo: Signal<Topo | null> = computed<Topo | null>(() => {
    const id = this.topoId();
    return id ? this.global.topos().find((t) => t.id === id) || null : null;
  });

  topoRoutesDetailed: Signal<(TopoRoute & { route?: Route })[]> = computed(
    () => {
      const id = this.topoId();
      if (!id) return [] as (TopoRoute & { route?: Route })[];
      const tr = this.global.topoRoutes().filter((r) => r.topoId === id);
      const routesIndex = new Map(
        this.global.routesData().map((r) => [r.id, r] as const),
      );
      return tr.map((item) => ({
        ...item,
        route: routesIndex.get(item.routeId),
      }));
    },
  );

  // Table columns for Taiga UI table
  protected readonly columns: string[] = [
    'grade',
    'number',
    'route',
    'height',
    'actions',
  ];

  protected readonly sortKey: WritableSignal<TableKey> =
    signal<TableKey>('number');
  protected readonly direction: WritableSignal<TuiSortDirection> =
    signal<TuiSortDirection>(TuiSortDirection.Asc);

  private gradeRank(grade?: string): number {
    if (!grade) return Number.POSITIVE_INFINITY;
    const m = /^\s*(\d)\s*([a-cA-C])?\s*(\+)?\s*$/i.exec(grade);
    if (!m) return Number.POSITIVE_INFINITY;
    const base = parseInt(m[1], 10);
    const letter = (m[2] || '').toLowerCase();
    const plus = !!m[3];
    const letterVal =
      letter === 'a' ? 0 : letter === 'b' ? 1 : letter === 'c' ? 2 : 0;
    return base * 10 + letterVal + (plus ? 0.5 : 0);
  }

  // Data source for tuiTableSort, includes comparable values and original ref
  protected readonly tableData: Signal<Row[]> = computed(() =>
    this.topoRoutesDetailed().map((tr) => ({
      grade: this.gradeRank(tr.route?.grade),
      number: tr.number,
      route: tr.route?.name || '',
      height:
        tr.route?.height !== null && tr.route?.height !== undefined
          ? tr.route.height
          : null,
      _ref: tr,
    })),
  );

  // Row type used by the table and comparators
  protected readonly sorters: Record<TableKey, TuiComparator<Row>> = {
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    number: (a, b) => tuiDefaultSort(a.number, b.number),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    height: (a, b) =>
      tuiDefaultSort(
        a.height ?? Number.POSITIVE_INFINITY,
        b.height ?? Number.POSITIVE_INFINITY,
      ),
  };

  protected getSorter(col: string): TuiComparator<Row> | null {
    if (col === 'actions') return null;
    return this.sorters[col as TableKey] ?? null;
  }

  protected get tableSorter(): TuiComparator<Row> {
    return this.sorters[this.sortKey()];
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.topoId.set(id);
    this.global.setSelectedTopo(id);
    // set the selected crag and zone from topo context if possible
    const topo = this.global.topos().find((t) => t.id === id);
    if (topo) {
      this.global.setSelectedCrag(topo.cragId);
      const crag = this.global.crags().find((c) => c.id === topo.cragId);
      if (crag) this.global.setSelectedZone(crag.zoneId);
      // entering a topo clears any specific route selection
      this.global.setSelectedRoute(null);
    }
  }

  goBack(): void {
    this.location.back();
  }
}
