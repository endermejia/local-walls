import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  Signal,
  computed,
  input,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiBadge, TuiAvatar } from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { TuiTable, TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TuiLet, tuiDefaultSort } from '@taiga-ui/cdk';
import { TranslatePipe } from '@ngx-translate/core';
import { GlobalData } from '../services';
import type { ClimbingRoute, TopoRoute } from '../models';
import { gradeRank } from '../utils';

export type RoutesTableKey = 'grade' | 'number' | 'route' | 'height';

export interface RoutesTableRow {
  grade: number;
  number: number;
  route: string;
  height: number | null;
  _ref: TopoRoute & { route?: ClimbingRoute };
}

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    RouterLink,
    TuiBadge,
    TuiAvatar,
    TranslatePipe,
    TuiTable,
    TuiCell,
    TuiLet,
  ],
  template: `
    <div class="overflow-auto">
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
                        >
                          {{
                            item._ref.route?.name ||
                              ('labels.route' | translate)
                          }}
                        </a>
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
                      <div tuiCell size="m" class="flex items-center gap-2">
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesTableComponent {
  protected readonly global = inject(GlobalData);

  data: InputSignal<(TopoRoute & { route?: ClimbingRoute })[]> =
    input.required();
  direction: InputSignal<TuiSortDirection> = input<TuiSortDirection>(
    TuiSortDirection.Asc,
  );

  protected readonly columns: string[] = [
    'grade',
    'number',
    'route',
    'height',
    'actions',
  ];

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map((tr) => ({
      grade: gradeRank(tr.route?.grade),
      number: tr.number,
      route: tr.route?.name || '',
      height:
        tr.route?.height !== null && tr.route?.height !== undefined
          ? tr.route.height
          : null,
      _ref: tr,
    })),
  );

  protected readonly sorters: Record<
    RoutesTableKey,
    TuiComparator<RoutesTableRow>
  > = {
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    number: (a, b) => tuiDefaultSort(a.number, b.number),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    height: (a, b) =>
      tuiDefaultSort(
        a.height ?? Number.POSITIVE_INFINITY,
        b.height ?? Number.POSITIVE_INFINITY,
      ),
  };

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions') return null;
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected get tableSorter(): TuiComparator<RoutesTableRow> {
    return this.sorters['number'];
  }
}
