import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { DecimalPipe, PercentPipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  TuiAxes,
  TuiLegendItem,
  TuiLineChart,
  TuiLineChartHint,
  TuiRingChart,
} from '@taiga-ui/addon-charts';
import {
  TuiDataList,
  TuiHint,
  TuiLoader,
  TuiTextfield,
  tuiHintOptionsProvider,
  TuiButton,
} from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TuiPoint } from '@taiga-ui/core/types';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../services';
import {
  AscentType,
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  UserAscentStatRecord,
} from '../models';
import { CountUpDirective } from '../directives/count-up.directive';
import { TuiHovered } from '@taiga-ui/cdk';

interface RouteScore {
  name: string;
  gradeLabel: string;
  gradeId?: number;
  score: number;
  type: AscentType;
  areaSlug: string;
  cragSlug: string;
  routeSlug: string;
}

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
          {{ 'labels.statistics' | translate }}
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
                {{ 'labels.ascents' | translate }}
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
                        {{ 'labels.showMore' | translate }}
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
                        {{ 'labels.ascents' | translate }}
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
                    style="color: var(--tui-status-info)"
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
                  {{ route.name || ('labels.anonymous' | translate) }}
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
            {{ context.count }} {{ 'labels.ascents' | translate | lowercase }}
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
                {{ route.name || ('labels.anonymous' | translate) }}
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
    if (option === 'all_time') return this.translate.instant('labels.allTime');
    if (option === 'last_12_months')
      return this.translate.instant('labels.last12Months');
    if (option === 'last_6_months')
      return this.translate.instant('labels.last6Months');
    if (option === 'this_year')
      return (
        this.translate.instant('labels.year') + ' ' + new Date().getFullYear()
      );
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
    return this.filterAscentsByDate(all, this.dateFilterSignal());
  });

  private dateFilterSignal = signal<string>('last_12_months');

  // --- New Computed Signals for Dashboard ---

  // 1. Total Score & Top Routes for the selected period
  periodScoreData = computed(() => {
    return this.calculatePeriodScore(this.stats());
  });

  totalScore = computed(() => this.periodScoreData().score);
  topRoutes = computed(() => this.periodScoreData().topRoutes);

  // 2. Max Grades (RP, OS, Flash)
  maxRedpoint = computed(() => this.getMaxGrade(this.stats(), ['rp']));
  maxOnsight = computed(() =>
    this.getMaxGrade(this.stats(), ['os', 'onsight']),
  );
  maxFlash = computed(() => this.getMaxGrade(this.stats(), ['f', 'flash']));

  // 3. Ascent Type Distribution
  ascentTypeDistribution = computed(() => {
    const stats = this.stats();
    let os = 0,
      flash = 0,
      rp = 0;

    stats.forEach((a) => {
      const type = (a.ascent_type || 'rp').toLowerCase();
      if (type === 'os' || type === 'onsight') os++;
      else if (type === 'f' || type === 'flash') flash++;
      else rp++;
    });

    return {
      os,
      flash,
      rp,
      total: stats.length,
    };
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

  private getMaxGrade(
    ascents: UserAscentStatRecord[],
    types: string[],
  ): string | null {
    let maxGradeId = -1;
    ascents.forEach((a) => {
      const type = (a.ascent_type || 'rp').toLowerCase();
      if (types.includes(type)) {
        const gradeId = a.ascent_grade || a.route_grade;
        if (gradeId && gradeId > maxGradeId) {
          maxGradeId = gradeId;
        }
      }
    });

    if (maxGradeId !== -1) {
      return VERTICAL_LIFE_TO_LABEL[maxGradeId as VERTICAL_LIFE_GRADES] || null;
    }
    return null;
  }

  private filterAscentsByDate(
    ascents: UserAscentStatRecord[],
    filter: string,
  ): UserAscentStatRecord[] {
    if (!filter || filter === 'all_time') return ascents;

    const now = new Date();
    let cutOff = new Date(0); // Epoch

    if (filter === 'last_12_months') {
      cutOff = new Date();
      cutOff.setFullYear(now.getFullYear() - 1);
    } else if (filter === 'last_6_months') {
      cutOff = new Date();
      cutOff.setMonth(now.getMonth() - 6);
    } else if (filter === 'this_year') {
      cutOff = new Date(now.getFullYear(), 0, 1);
    } else if (/^\d{4}$/.test(filter)) {
      // Specific Year
      const y = parseInt(filter, 10);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59);
      return ascents.filter((a: UserAscentStatRecord) => {
        const d = new Date(a.ascent_date);
        return d >= start && d <= end;
      });
    }

    return ascents.filter(
      (a: UserAscentStatRecord) => new Date(a.ascent_date) >= cutOff,
    );
  }

  // --- Grade Distribution Logic (Pyramid) ---
  gradeDistribution = computed(() => {
    const stats = this.stats();
    if (stats.length === 0) return { rows: [], total: 0, maxCount: 0 };

    // Buckets by Grade
    // We need OS, Flash, RP counts per Grade.
    // Map<GradeId, { os: 0, flash: 0, rp: 0, total: 0 }>
    const buckets = new Map<
      number,
      {
        os: number;
        flash: number;
        rp: number;
        total: number;
        label: string;
        routes: RouteScore[];
      }
    >();

    let totalAscents = 0;

    stats.forEach((ascent: UserAscentStatRecord) => {
      const routeScore = this.mapAscentToRouteScore(ascent);
      if (!routeScore) return;
      const gradeId = routeScore.gradeId!;

      if (!buckets.has(gradeId)) {
        buckets.set(gradeId, {
          os: 0,
          flash: 0,
          rp: 0,
          total: 0,
          label: routeScore.gradeLabel,
          routes: [],
        });
      }

      const bucket = buckets.get(gradeId)!;
      bucket.total++;
      totalAscents++;

      bucket.routes.push(routeScore);

      const type = (ascent.ascent_type || 'rp').toLowerCase();
      if (type === 'os' || type === 'onsight') bucket.os++;
      else if (type === 'f' || type === 'flash') bucket.flash++;
      else bucket.rp++;
    });

    if (buckets.size === 0) return { rows: [], total: 0, maxCount: 0 };

    // Sort Descending (Highest Grade Top)
    const sortedGradeIds = Array.from(buckets.keys()).sort((a, b) => b - a);

    const hasMore = sortedGradeIds.length > 8;
    const topGrades = this.showAllGrades()
      ? sortedGradeIds
      : sortedGradeIds.slice(0, 8);

    let maxBucketCount = 0;
    const rows = topGrades.map((id) => {
      const b = buckets.get(id)!;
      if (b.total > maxBucketCount) maxBucketCount = b.total;

      // Filter and sort routes for each category
      const osRoutes = b.routes
        .filter((r) => r.type === 'os')
        .sort((x, y) => y.score - x.score);
      const flashRoutes = b.routes
        .filter((r) => r.type === 'f')
        .sort((x, y) => y.score - x.score);
      const rpRoutes = b.routes
        .filter((r) => r.type !== 'os' && r.type !== 'f')
        .sort((x, y) => y.score - x.score);

      return {
        gradeLabel: b.label,
        os: b.os,
        flash: b.flash,
        rp: b.rp,
        total: b.total,
        osRoutes,
        flashRoutes,
        rpRoutes,
      };
    });

    return { rows, total: totalAscents, maxCount: maxBucketCount, hasMore };
  });

  // --- Trend Logic ---

  // Scoring Helpers
  private getScore(gradeId: number, type: AscentType): number {
    // Base: 8a (29) = 1000. Step = 50.
    // Bonus: OS + 2 steps (100), Flash + 1 step (50).
    let bonus = 0;
    if (type === 'os') bonus = 100;
    else if (type === 'f') bonus = 50;

    // Calculate base score relative to 8a
    // 8a is index 29 in VERTICAL_LIFE_GRADES
    const baseScore = 1000 + (gradeId - 29) * 50;

    return baseScore + bonus;
  }

  // Chart Dimensions (Pixels)
  readonly width = 1000;
  readonly height = 200;

  // Shared source for chart data to ensure sync between line chart and tooltip details
  private readonly chartSource = computed(() => {
    const stats = this.rawStats();
    if (stats.length === 0) return [];

    const ascentsByYear = new Map<string, UserAscentStatRecord[]>();
    const currentYear = new Date().getFullYear();
    let minYear = currentYear;

    stats.forEach((ascent: UserAscentStatRecord) => {
      const dateStr = ascent.ascent_date;
      if (!dateStr) return;
      const year = new Date(dateStr).getFullYear();
      const yearStr = year.toString();

      if (year < minYear) minYear = year;
      if (!ascentsByYear.has(yearStr)) ascentsByYear.set(yearStr, []);
      ascentsByYear.get(yearStr)?.push(ascent);
    });

    const dataPoints: {
      label: string;
      score: number;
      topRoutes: RouteScore[];
    }[] = [];

    // 1. Yearly Data (up to currentYear - 1)
    for (let y = minYear; y < currentYear; y++) {
      const yearStr = y.toString();
      const ascents = ascentsByYear.get(yearStr) || [];
      dataPoints.push({
        label: yearStr,
        ...this.calculatePeriodScore(ascents),
      });
    }

    // 2. 'Today' Data (Last 12 Months)
    const now = new Date();
    const last12MonthsShortDate = new Date();
    last12MonthsShortDate.setFullYear(now.getFullYear() - 1);

    // Filter raw stats for last 12 months
    const last12MonthsAscents = stats.filter((a: UserAscentStatRecord) => {
      const d = new Date(a.ascent_date);
      return d >= last12MonthsShortDate && d <= now;
    });

    dataPoints.push({
      label: this.translate.instant('labels.today'),
      ...this.calculatePeriodScore(last12MonthsAscents),
    });

    return dataPoints;
  });

  private calculatePeriodScore(ascents: UserAscentStatRecord[]): {
    score: number;
    topRoutes: RouteScore[];
  } {
    const validAscents = ascents
      .map((a) => this.mapAscentToRouteScore(a))
      .filter((a): a is RouteScore => a !== null && a.score > 0);

    validAscents.sort((a, b) => b.score - a.score);
    const top10 = validAscents.slice(0, 10);
    const totalScore = top10.reduce(
      (sum: number, a: RouteScore) => sum + a.score,
      0,
    );

    return { score: totalScore, topRoutes: top10 };
  }

  private mapAscentToRouteScore(a: UserAscentStatRecord): RouteScore | null {
    let gradeId = a.ascent_grade;
    if (!gradeId && a.route_grade) gradeId = a.route_grade;
    const name = a.route_name || 'Unknown Route';

    if (!gradeId) return null;

    return {
      name,
      gradeLabel:
        VERTICAL_LIFE_TO_LABEL[gradeId as VERTICAL_LIFE_GRADES] || '?',
      gradeId: gradeId as number,
      score: this.getScore(gradeId, (a.ascent_type || 'rp') as AscentType),
      type: (a.ascent_type || 'rp') as AscentType,
      areaSlug: a.area_slug || '',
      cragSlug: a.crag_slug || '',
      routeSlug: a.route_slug || '',
    };
  }

  trendData = computed(() => {
    const source = this.chartSource();
    if (source.length === 0) return { years: [], series: [], maxY: 0, minY: 0 };

    const years = source.map((d) => d.label);
    const scores = source.map((d) => d.score);
    const realMin = Math.min(...scores);
    const realMax = Math.max(...scores);

    // Dynamic Scale Calculation (Zoomed Linear)
    // We want to show variations, so we don't start at 0 unless values are low.
    const range = realMax - realMin;
    // Ensure we have some range if flat
    const safeRange = range === 0 ? realMin * 0.1 || 100 : range;

    // Add ~10-20% padding
    let domMin = Math.floor(realMin - safeRange * 0.2);
    if (domMin < 0) domMin = 0;

    const domMax = Math.ceil(realMax + safeRange * 0.1);

    const domRange = domMax - domMin;

    const series: TuiPoint[] = [];
    const xStep = years.length > 1 ? this.width / (years.length - 1) : 0;

    scores.forEach((score, index) => {
      const x = years.length > 1 ? index * xStep : this.width / 2;
      // Map score to 0..height pixels relative to domain
      const y = ((score - domMin) / domRange) * this.height;
      series.push([x, y]);
    });

    return {
      years,
      series,
      maxY: domMax,
      minY: domMin,
    };
  });

  trendDetails = computed(() => {
    return this.chartSource().map((d) => ({
      totalScore: d.score,
      topRoutes: d.topRoutes,
    }));
  });

  trendYLabels = computed(() => {
    const data = this.trendData();
    if (data.years.length === 0) return [];

    const { minY, maxY } = data;
    const labels: string[] = [];
    // 5 lines = 5 intervals? usually verticalLines is lines count.
    // TuiAxes verticalLines is for X axis. horizontalLines is for Y axis lines.
    // TuiAxes has [horizontalLines]="5". That means 5 lines -> 4 spaces?
    // Usually we want N labels for N lines.
    // Let's generate 5 labels distributed evenly.
    const count = 5;
    const step = (maxY - minY) / (count - 1 || 1);

    for (let i = 0; i < count; i++) {
      labels.push(Math.round(minY + i * step).toString());
    }
    return labels;
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
