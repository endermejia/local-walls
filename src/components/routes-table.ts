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
import { TuiBadge, TuiAvatar, TuiRating } from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { TuiTable, TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TuiLet, tuiDefaultSort } from '@taiga-ui/cdk';
import { TranslatePipe } from '@ngx-translate/core';
import { GlobalData } from '../services';
import type { ClimbingRoute } from '../models';
import { FormsModule } from '@angular/forms';

export type RoutesTableKey = 'grade' | 'route' | 'rating' | 'ascents';

export interface RoutesTableRow {
  grade: string;
  route: string;
  rating: number;
  ascents: number;
  _ref: ClimbingRoute;
}

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    RouterLink,
    TuiBadge,
    TuiAvatar,
    TuiRating,
    TranslatePipe,
    TuiTable,
    TuiCell,
    TuiLet,
    FormsModule,
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
        <tbody
          *tuiLet="tableData() | tuiTableSort as sortedData"
          tuiTbody
          [data]="sortedData"
        >
          @for (item of sortedData; track item._ref.zlaggableId) {
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
                          {{ item._ref.difficulty || '—' }}
                        </tui-avatar>
                      </div>
                    }
                    @case ('route') {
                      <div tuiCell size="m">
                        <a
                          [routerLink]="[
                            '/route',
                            item._ref.countrySlug,
                            item._ref.cragSlug,
                            'sector',
                            item._ref.sectorSlug,
                            item._ref.zlaggableSlug,
                          ]"
                          class="tui-link"
                        >
                          {{
                            item._ref.zlaggableName ||
                              ('labels.route' | translate)
                          }}
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
                        <span>{{ item._ref.totalAscents ?? 0 }}</span>
                      </div>
                    }
                    @case ('actions') {
                      <div tuiCell size="m" class="flex items-center gap-2">
                        <tui-badge
                          appearance="neutral"
                          iconStart="@tui.heart"
                          size="xl"
                          (click.zoneless)="
                            global.toggleLikeRoute(item._ref.zlaggableId)
                          "
                          [attr.aria-label]="'actions.favorite.add' | translate"
                          [attr.title]="'actions.favorite.add' | translate"
                        />
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

  // Inputs
  data: InputSignal<ClimbingRoute[]> = input.required<ClimbingRoute[]>();
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
    this.data().map((r) => ({
      grade: r.difficulty || '',
      route: r.zlaggableName || '',
      rating: r.averageRating ?? 0,
      ascents: r.totalAscents ?? 0,
      _ref: r,
    })),
  );

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

  protected get tableSorter(): TuiComparator<RoutesTableRow> {
    return this.sorters['ascents'];
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
