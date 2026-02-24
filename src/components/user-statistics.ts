import { DecimalPipe, LowerCasePipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiAxes,
  TuiLegendItem,
  TuiLineChart,
  TuiLineChartHint,
  TuiRingChart,
} from '@taiga-ui/addon-charts';
import { TuiHovered } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDataList,
  TuiHint,
  TuiLoader,
  tuiHintOptionsProvider,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiPoint } from '@taiga-ui/core/types';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../services/ascents.service';

import { CountUpDirective } from '../directives/count-up.directive';
import { UserAscentStatRecord } from '../models';
import {
  calculateAscentTypeDistribution,
  calculateGradeDistribution,
  calculatePeriodScore,
  calculateTrendData,
  calculateTrendYLabels,
  filterAscentsByDate,
  getMaxGrade,
} from '../utils/statistics-math.utils';

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiAxes,
    TuiLineChart,
    TuiLineChartHint,
    TuiRingChart,
    TuiLegendItem,
    TuiHint,
    TuiLoader,
    TuiSelect,
    TuiTextfield,
    TuiDataList,
    TuiDataListWrapper,
    TranslatePipe,
    DecimalPipe,
    PercentPipe,
    LowerCasePipe,
    RouterLink,
    TuiButton,
    CountUpDirective,
    TuiHovered,
  ],
  styles: [
    `
      :host {
        --tui-chart-0: var(--tui-status-info);
        --tui-chart-categorical-00: var(--tui-status-positive); /* OS */
        --tui-chart-categorical-01: var(--tui-status-warning); /* Flash */
        --tui-chart-categorical-02: var(--tui-status-negative); /* Redpoint */
        display: block;
      }

      /* Cleaned up styles for dashboard */
      .chart-container {
        height: 200px;
        width: 100%;
      }

      .chart-line {
        color: var(--tui-status-info);
      }

      .trend-hint {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-width: 210px;
        padding: 0.5rem 0;
      }
      .trend-hint-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        border-bottom: 1px solid var(--tui-border-normal);
        padding-bottom: 0.75rem;
        margin-bottom: 0.25rem;
      }
      .trend-hint-year {
        font: var(--tui-font-text-s);
        opacity: 0.5;
        font-weight: bold;
      }
      .trend-hint-score {
        font: var(--tui-font-heading-4);
        font-weight: 900;
      }
      .trend-routes {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .trend-route-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .route-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 120px;
        text-decoration: none;
        transition: opacity 0.2s;
      }
      .route-name:hover {
        text-decoration: underline;
        opacity: 0.8;
      }
      .route-name.onsight {
        color: var(--tui-status-positive);
      }
      .route-name.flash {
        color: var(--tui-status-warning);
      }
      .route-name.redpoint {
        color: var(--tui-status-negative);
      }
      .route-score {
        font-family: monospace;
        text-align: right;
      }
      .route-score-grade {
        font: var(--tui-font-text-m);
        opacity: 0.8;
        margin-right: 0.5rem;
      }
      .route-score-val {
        opacity: 0.6;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    tuiHintOptionsProvider({
      appearance: 'dark',
    }),
  ],
  template: `
    <div class="grid gap-4 max-w-7xl mx-auto">
      <!-- Header / Filter -->
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h2 class="text-2xl font-bold hidden sm:block">
          {{ 'statistics' | translate }}
        </h2>
        <tui-textfield
          class="w-full sm:w-48"
          [tuiTextfieldCleaner]="false"
          [stringify]="dateValueContent"
          tuiTextfieldSize="l"
        >
          <input tuiSelect [formControl]="dateFilterControl" />
          <tui-data-list *tuiTextfieldDropdown>
            <tui-data-list-wrapper new [items]="dateFilterOptions()" />
          </tui-data-list>
        </tui-textfield>
      </div>

      <tui-loader [showLoader]="statsResource.isLoading()">
        <div class="grid gap-6">
          <!-- Score Card -->
          <div
            class="bg-[var(--tui-background-base)] shadow-md rounded-2xl p-6 text-center border border-[var(--tui-border-normal)]"
          >
            <div
              class="text-[var(--tui-text-tertiary)] uppercase text-sm font-bold tracking-wider mb-2"
            >
              {{ 'statistics.totalScore' | translate }}
            </div>
            <div
              class="text-6xl font-black tabular-nums tracking-tight"
              [appCountUp]="totalScore()"
              #totalScoreAnim="appCountUp"
            >
              {{ totalScoreAnim.currentValue() | number: '1.0-0' }}
            </div>
            <div class="text-[var(--tui-text-tertiary)] mt-2 text-sm">
              {{ 'statistics.top10Ascents' | translate }}
            </div>
          </div>

          <!-- Key Stats Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
            >
              <div
                class="text-3xl font-bold"
                [appCountUp]="gradeDistribution().total"
                #totalAscentsAnim="appCountUp"
              >
                {{ totalAscentsAnim.currentValue() | number: '1.0-0' }}
              </div>
              <div class="text-xs uppercase opacity-70 font-semibold">
                {{ 'ascents' | translate }}
              </div>
            </div>
            <div
              class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
            >
              <div class="text-3xl font-bold text-[var(--tui-status-negative)]">
                {{ maxRedpoint() || '-' }}
              </div>
              <div class="text-xs uppercase opacity-70 font-semibold">
                {{ 'ascentTypes.rp' | translate }}
              </div>
            </div>
            <div
              class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
            >
              <div class="text-3xl font-bold text-[var(--tui-status-positive)]">
                {{ maxOnsight() || '-' }}
              </div>
              <div class="text-xs uppercase opacity-70 font-semibold">
                {{ 'ascentTypes.os' | translate }}
              </div>
            </div>
            <div
              class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
            >
              <div class="text-3xl font-bold text-[var(--tui-status-warning)]">
                {{ maxFlash() || '-' }}
              </div>
              <div class="text-xs uppercase opacity-70 font-semibold">
                {{ 'ascentTypes.f' | translate }}
              </div>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Grade Pyramid -->
            <div
              class="lg:col-span-2 bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)]"
            >
              <h3 class="font-bold text-lg mb-4">
                {{ 'statistics.gradePyramid' | translate }}
              </h3>

              @let dist = gradeDistribution();
              @if (dist.total > 0) {
                <div class="flex flex-col gap-2">
                  @for (row of dist.rows; track row.gradeLabel) {
                    <div
                      class="grid grid-cols-[3rem_1fr_3rem] gap-3 items-center text-sm"
                    >
                      <div
                        class="font-bold text-center text-[var(--tui-text-secondary)]"
                      >
                        {{ row.gradeLabel }}
                      </div>
                      <div
                        class="h-6 flex rounded overflow-hidden relative mx-auto"
                        [style.width.%]="(row.total / dist.maxCount) * 100"
                      >
                        <!-- Background bar for context - Optional, maybe remove if pyramid shape is desired without track.
                             If we keep it, it should be 100% of this container. -->
                        <div
                          class="absolute inset-0 opacity-10 bg-[var(--tui-text-primary)]"
                        ></div>

                        <!-- Segments -->
                        @if (row.rp > 0) {
                          <div
                            class="bg-[var(--tui-status-negative)] h-full transition-all duration-500"
                            [style.width.%]="(row.rp / row.total) * 100"
                            [tuiHint]="pyramidHint"
                            [tuiHintContext]="{
                              label: row.gradeLabel,
                              type: 'rp',
                              count: row.rp,
                              routes: row.rpRoutes,
                            }"
                          ></div>
                        }
                        @if (row.flash > 0) {
                          <div
                            class="bg-[var(--tui-status-warning)] h-full transition-all duration-500"
                            [style.width.%]="(row.flash / row.total) * 100"
                            [tuiHint]="pyramidHint"
                            [tuiHintContext]="{
                              label: row.gradeLabel,
                              type: 'f',
                              count: row.flash,
                              routes: row.flashRoutes,
                            }"
                          ></div>
                        }
                        @if (row.os > 0) {
                          <div
                            class="bg-[var(--tui-status-positive)] h-full transition-all duration-500"
                            [style.width.%]="(row.os / row.total) * 100"
                            [tuiHint]="pyramidHint"
                            [tuiHintContext]="{
                              label: row.gradeLabel,
                              type: 'os',
                              count: row.os,
                              routes: row.osRoutes,
                            }"
                          ></div>
                        }
                      </div>
                      <div class="font-mono text-center opacity-70">
                        {{ row.total }}
                      </div>
                    </div>
                  }

                  @if (dist.hasMore && !showAllGrades()) {
                    <div class="flex justify-center mt-4">
                      <button
                        tuiButton
                        appearance="secondary"
                        size="s"
                        (click)="showAllGrades.set(true)"
                      >
                        {{ 'showMore' | translate }}
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <div class="opacity-50 text-center py-10">
                  {{ 'statistics.noData' | translate }}
                </div>
              }
            </div>

            <!-- Style Distribution -->
            <div
              class="bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)] flex flex-col items-center"
            >
              <h3 class="font-bold text-lg mb-4 self-start">
                {{ 'statistics.styleDistribution' | translate }}
              </h3>

              @let styleDist = ascentTypeDistribution();
              @if (styleDist.total > 0) {
                <div class="relative w-48 h-48 my-4">
                  <tui-ring-chart
                    [value]="[styleDist.os, styleDist.flash, styleDist.rp]"
                    size="l"
                    class="w-full h-full"
                    [(activeItemIndex)]="activeItemIndex"
                  >
                    <div class="text-center">
                      <div
                        class="text-2xl font-bold"
                        [appCountUp]="styleDist.total"
                        #styleTotalAnim="appCountUp"
                      >
                        {{ styleTotalAnim.currentValue() | number: '1.0-0' }}
                      </div>
                      <div class="text-xs uppercase opacity-70">
                        {{ 'ascents' | translate }}
                      </div>
                    </div>
                  </tui-ring-chart>
                </div>

                <div class="flex flex-col gap-2 w-full mt-4">
                  <tui-legend-item
                    size="s"
                    text="{{ 'ascentTypes.os' | translate }}"
                    class="cursor-pointer transition-opacity"
                    [color]="'var(--tui-status-positive)'"
                    [active]="isItemActive(0)"
                    (tuiHoveredChange)="onHover(0, $event)"
                  >
                    <span class="font-mono ml-auto"
                      >{{ styleDist.os }} ({{
                        styleDist.os / styleDist.total | percent: '1.0-1'
                      }})</span
                    >
                  </tui-legend-item>
                  <tui-legend-item
                    size="s"
                    text="{{ 'ascentTypes.f' | translate }}"
                    class="cursor-pointer transition-opacity"
                    [color]="'var(--tui-status-warning)'"
                    [active]="isItemActive(1)"
                    (tuiHoveredChange)="onHover(1, $event)"
                  >
                    <span class="font-mono ml-auto"
                      >{{ styleDist.flash }} ({{
                        styleDist.flash / styleDist.total | percent: '1.0-1'
                      }})</span
                    >
                  </tui-legend-item>
                  <tui-legend-item
                    size="s"
                    text="{{ 'ascentTypes.rp' | translate }}"
                    class="cursor-pointer transition-opacity"
                    [color]="'var(--tui-status-negative)'"
                    [active]="isItemActive(2)"
                    (tuiHoveredChange)="onHover(2, $event)"
                  >
                    <span class="font-mono ml-auto"
                      >{{ styleDist.rp }} ({{
                        styleDist.rp / styleDist.total | percent: '1.0-1'
                      }})</span
                    >
                  </tui-legend-item>
                </div>
              } @else {
                <div class="opacity-50 text-center py-10">
                  {{ 'statistics.noData' | translate }}
                </div>
              }
            </div>
          </div>

          <!-- Yearly Trend -->
          <div
            class="bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)]"
          >
            <header class="mb-4">
              <h3 class="font-bold text-lg">
                {{ 'statistics.sportClimbingTrend' | translate }}
              </h3>
            </header>

            @if (trendData().years.length > 0) {
              <div class="chart-container">
                <tui-axes
                  class="chart-container"
                  [axisXLabels]="trendData().years"
                  [axisYLabels]="trendYLabels()"
                  [verticalLines]="trendData().years.length"
                  [horizontalLines]="5"
                  [tuiLineChartHint]="trendHintContent"
                >
                  <!-- Total Score Trend -->
                  <tui-line-chart
                    [value]="trendData().series"
                    [x]="0"
                    [y]="0"
                    [width]="width"
                    [height]="height"
                    [xStringify]="null"
                    [yStringify]="null"
                    [dots]="true"
                    [filled]="true"
                    class="chart-line"
                  ></tui-line-chart>
                </tui-axes>
              </div>
            } @else {
              <div class="no-data">
                {{ 'statistics.noData' | translate }}
              </div>
            }
          </div>
        </div>
      </tui-loader>
    </div>

    <!-- Hint content for Line Chart -->
    <ng-template #trendHintContent let-context>
      <div class="trend-hint">
        @let index = getIndex(context);
        @let details = trendDetails()[index];

        <div class="trend-hint-header">
          <span class="trend-hint-year">{{ trendData().years[index] }}</span>
          <span class="trend-hint-score">
            {{ (details?.totalScore | number) || 0 }} pt
          </span>
        </div>

        @if (details) {
          <div class="trend-routes">
            @for (route of details.topRoutes; track $index) {
              <div class="trend-route-row">
                <a
                  class="route-name"
                  [routerLink]="[
                    '/area',
                    route.areaSlug,
                    route.cragSlug,
                    route.routeSlug,
                  ]"
                  [class.onsight]="route.type === 'os'"
                  [class.flash]="route.type === 'f'"
                  [class.redpoint]="route.type === 'rp' || !route.type"
                >
                  {{ route.name || ('anonymous' | translate) }}
                </a>
                <span class="route-score">
                  <span class="route-score-grade">
                    {{ route.gradeLabel }}
                  </span>
                  <span class="route-score-val">{{ route.score }}</span>
                </span>
              </div>
            }
          </div>
        }
      </div>
    </ng-template>

    <ng-template #pyramidHint let-context>
      <div class="trend-hint">
        <div class="trend-hint-header">
          <span class="trend-hint-year">
            {{ context.label }}
            @if (context.type === 'os') {
              ({{ 'ascentTypes.os' | translate }})
            }
            @if (context.type === 'f') {
              ({{ 'ascentTypes.f' | translate }})
            }
            @if (context.type === 'rp') {
              ({{ 'ascentTypes.rp' | translate }})
            }
          </span>
          <span class="trend-hint-score">
            {{ context.count }} {{ 'ascents' | translate | lowercase }}
          </span>
        </div>

        <div class="trend-routes">
          @for (route of context.routes; track $index) {
            <div class="trend-route-row">
              <a
                class="route-name"
                [routerLink]="[
                  '/area',
                  route.areaSlug,
                  route.cragSlug,
                  route.routeSlug,
                ]"
                [class.onsight]="route.type === 'os'"
                [class.flash]="route.type === 'f'"
                [class.redpoint]="route.type === 'rp' || !route.type"
              >
                {{ route.name || ('anonymous' | translate) }}
              </a>
              <span class="route-score">
                <span class="route-score-val">{{ route.score }}</span>
              </span>
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class UserStatisticsComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly translate = inject(TranslateService);
  userId = input.required<string>();

  // --- Date Filter Support ---
  readonly dateFilterControl = new FormControl('last_12_months');
  readonly showAllGrades = signal(false);
  activeItemIndex = NaN;

  readonly dateFilterOptions = computed(() => {
    // Reusing standard options logic// Simplified for now, can be dynamic
    // Ideally inject a service or use the same logic as profile. for now hardcode common ones + dynamic years could be better but sticking to request.
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) years.push((currentYear - i).toString());

    return [
      'all_time',
      'last_12_months',
      'last_6_months',
      'this_year',
      ...years.filter((y) => y !== currentYear.toString()),
    ];
  });

  readonly dateValueContent = (option: string): string => {
    if (option === 'all_time') return this.translate.instant('allTime');
    if (option === 'last_12_months')
      return this.translate.instant('last12Months');
    if (option === 'last_6_months')
      return this.translate.instant('last6Months');
    if (option === 'this_year')
      return this.translate.instant('year') + ' ' + new Date().getFullYear();
    return option;
  };

  // --- Data Loading ---
  statsResource = resource({
    params: () => ({
      userId: this.userId(),
      dateFilter: this.dateFilterControl.value,
    }),
    loader: async ({ params }) => {
      // We load all and filter client side for smooth UX or load specific?
      // AscentsService.getUserStats usually gets specific columns.
      // Let's get all and filtering in computed is easier for "All time" vs "12 months" toggle without network.
      // BUT if user has 10k ascents, maybe costly. Assuming reasonable count.
      // Only userId triggers reload. Filter triggers re-computation.
      return await this.ascentsService.getUserStats(params.userId!);
    },
  });

  // Create a filtered signal based on the control
  private rawStats = computed(() => {
    const data = (this.statsResource.value() as UserAscentStatRecord[]) ?? [];
    return data.filter((a) => a.ascent_type !== 'attempt');
  });

  // Filtered Stats
  stats = computed(() => {
    const all = this.rawStats();
    return filterAscentsByDate(all, this.dateFilterSignal());
  });

  private dateFilterSignal = signal<string>('last_12_months');

  // --- New Computed Signals for Dashboard ---

  // 1. Total Score & Top Routes for the selected period
  periodScoreData = computed(() => {
    return calculatePeriodScore(this.stats());
  });

  totalScore = computed(() => this.periodScoreData().score);
  topRoutes = computed(() => this.periodScoreData().topRoutes);

  // 2. Max Grades (RP, OS, Flash)
  maxRedpoint = computed(() => getMaxGrade(this.stats(), ['rp']));
  maxOnsight = computed(() => getMaxGrade(this.stats(), ['os', 'onsight']));
  maxFlash = computed(() => getMaxGrade(this.stats(), ['f', 'flash']));

  // 3. Ascent Type Distribution
  ascentTypeDistribution = computed(() => {
    return calculateAscentTypeDistribution(this.stats());
  });

  constructor() {
    // Sync form control to signal
    this.dateFilterControl.valueChanges.subscribe((val) => {
      this.dateFilterSignal.set(val || 'last_12_months');
    });
  }

  protected isItemActive(index: number): boolean {
    return this.activeItemIndex === index;
  }

  protected onHover(index: number, hovered: boolean): void {
    this.activeItemIndex = hovered ? index : NaN;
  }

  // --- Grade Distribution Logic (Pyramid) ---
  gradeDistribution = computed(() => {
    return calculateGradeDistribution(this.stats(), this.showAllGrades());
  });

  // --- Trend Logic ---

  // Chart Dimensions (Pixels)
  readonly width = 1000;
  readonly height = 200;

  trendData = computed(() => {
    return calculateTrendData(
      this.rawStats(),
      this.width,
      this.height,
      this.translate.instant('today'),
    );
  });

  trendDetails = computed(() => {
    return this.trendData().sourceData.map((d) => ({
      totalScore: d.score,
      topRoutes: d.topRoutes,
    }));
  });

  trendYLabels = computed(() => {
    const data = this.trendData();
    if (data.years.length === 0) return [];
    return calculateTrendYLabels(data.minY, data.maxY);
  });

  getIndex(context: readonly TuiPoint[]): number {
    // context is [[x, y]] (array of points)
    if (Array.isArray(context) && context.length > 0) {
      const x = context[0][0]; // Pixel X
      const yearsCount = this.trendData().years.length;
      if (yearsCount <= 1) return 0;

      const xStep = this.width / (yearsCount - 1);
      const index = Math.round(x / xStep);
      return Math.max(0, Math.min(index, yearsCount - 1));
    }
    return 0;
  }
}
