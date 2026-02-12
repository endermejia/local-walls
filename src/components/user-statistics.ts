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
import {
  TuiAxes,
  TuiLineChart,
  TuiLineChartHint,
} from '@taiga-ui/addon-charts';
import {
  TuiDataList,
  TuiHint,
  TuiLoader,
  TuiTextfield,
  TuiTitle,
  tuiHintOptionsProvider,
  TuiButton,
} from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TuiPoint } from '@taiga-ui/core/types';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { AscentsService } from '../services';
import {
  AscentType,
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  UserAscentStatRecord,
} from '../models';
import { DecimalPipe } from '@angular/common';

interface RouteScore {
  name: string;
  gradeLabel: string;
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
    TuiHint,
    TuiLoader,
    TuiTitle,
    TuiSelect,
    TuiTextfield,
    TuiDataList,
    TuiDataListWrapper,
    TranslatePipe,
    DecimalPipe,
    RouterLink,
    TuiButton,
  ],
  styles: [
    `
      :host {
        --tui-chart-0: var(--tui-status-info);
        display: block;
      }
      .wrapper {
        display: grid;
        gap: 2rem;
        grid-template-columns: 1fr;
      }
      .card {
        padding: 1.5rem;
      }
      .header {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end; /* Align filter to right since title is gone */
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .filter-wrapper {
        width: 100%;
      }
      @media (min-width: 640px) {
        .filter-wrapper {
          width: 12rem;
        }
      }
      /* Legend Removed */

      .total-text {
        font-weight: bold;
        font-size: 1.25rem;
      }
      .total-label {
        opacity: 0.7;
        text-transform: uppercase;
        font-size: 0.75rem;
        align-self: center;
        margin-left: 0.25rem;
      }

      .pyramid {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 100%;
        max-width: 56rem;
        margin: 0 auto;
        font: var(--tui-font-text-s);
      }
      .pyramid-header {
        display: grid;
        grid-template-columns: 1fr 40px 1fr;
        align-items: center;
        gap: 1rem;
        padding: 0.25rem 0.5rem;
        border-bottom: 1px solid;
        margin-bottom: 0.5rem;
        font-weight: 600;
        opacity: 0.5;
      }
      .pyramid-row {
        display: grid;
        grid-template-columns: 1fr 40px 1fr;
        align-items: center;
        gap: 1rem;
        padding: 0.25rem 0.5rem;
        border-radius: var(--tui-radius-xs);
        transition: background-color 0.3s;
      }

      @media (max-width: 640px) {
        .stats-col {
          display: none !important;
        }
        .pyramid-header,
        .pyramid-row {
          grid-template-columns: 40px 1fr !important;
        }
        .pyramid-header .grade-label,
        .pyramid-row .grade-label {
          text-align: left;
        }
      }

      .stats-col {
        display: grid;
        grid-template-columns: repeat(4, 4.5rem);
        justify-content: end;
        gap: 0.5rem;
        padding-right: 1rem;
        font-variant-numeric: tabular-nums;
      }

      .header-stat {
        width: 100%;
        text-align: center;
      }

      .header-stat.onsight {
        color: var(--tui-status-positive);
      }
      .header-stat.flash {
        color: var(--tui-status-warning);
      }
      .header-stat.redpoint {
        color: var(--tui-status-negative);
      }

      .grade-label {
        text-align: center;
        font-weight: 900;
        font-size: 1.125rem;
      }

      .bars-col {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 1rem;
        width: 100%;
      }

      .stacked-bar {
        display: flex;
        justify-content: center;
        height: 100%;
        border-radius: var(--tui-radius-xs);
        overflow: hidden;
        max-width: 100%;
        width: 100%;
      }

      .bar-seg {
        height: 100%;
      }
      .bar-seg.onsight {
        background-color: var(--tui-status-positive);
      }
      .bar-seg.flash {
        background-color: var(--tui-status-warning);
      }
      .bar-seg.redpoint {
        background-color: var(--tui-status-negative);
      }

      .stat-val {
        width: 100%;
        text-align: center;
      }
      .stat-val.hidden {
        opacity: 0;
      }
      .stat-val.bold {
        font-weight: bold;
      }
      .stat-val.total {
        font-weight: bold;
      }

      .no-data {
        text-align: center;
        opacity: 0.5;
        padding: 2.5rem 0;
      }

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
    <div class="wrapper">
      <!-- Grade Pyramid / Distribution -->
      <section class="card">
        <header class="header">
          <!-- Filter Dropdown -->
          <tui-textfield
            class="filter-wrapper"
            [tuiTextfieldCleaner]="false"
            [stringify]="dateValueContent"
            tuiTextfieldSize="m"
          >
            <input tuiSelect [formControl]="dateFilterControl" />
            <tui-data-list *tuiTextfieldDropdown>
              <tui-data-list-wrapper new [items]="dateFilterOptions()" />
            </tui-data-list>
          </tui-textfield>
        </header>

        <tui-loader [showLoader]="statsResource.isLoading()">
          @let dist = gradeDistribution();
          @if (dist.total > 0) {
            <!-- Legend Removed -->

            <!-- Pyramid -->
            <div class="pyramid">
              <!-- Header Row -->
              <div class="pyramid-header">
                <div class="stats-col">
                  <span class="header-stat onsight">
                    {{ 'ascentTypes.os' | translate }}
                  </span>
                  <span class="header-stat flash">
                    {{ 'ascentTypes.f' | translate }}
                  </span>
                  <span class="header-stat redpoint">
                    {{ 'ascentTypes.rp' | translate }}
                  </span>
                  <span class="header-stat total">Tot</span>
                </div>
                <div class="grade-label" style="text-align: center;">
                  {{ 'labels.grade' | translate }}
                </div>
                <!-- Total placed above bars -->
                <div
                  style="display: flex; align-items: baseline; justify-content: center;"
                >
                  <span class="total-text">{{ dist.total }}</span>
                  <span class="total-label">TOTAL</span>
                </div>
              </div>

              @for (row of dist.rows; track row.gradeLabel) {
                <div class="pyramid-row">
                  <!-- Stats Left -->
                  <div class="stats-col">
                    <span
                      class="stat-val"
                      [class.hidden]="!row.os"
                      [class.bold]="row.os"
                      >{{ row.os }}</span
                    >
                    <span
                      class="stat-val"
                      [class.hidden]="!row.flash"
                      [class.bold]="row.flash"
                      >{{ row.flash }}</span
                    >
                    <span
                      class="stat-val"
                      [class.hidden]="!row.rp"
                      [class.bold]="row.rp"
                      >{{ row.rp }}</span
                    >
                    <span class="stat-val total">{{ row.total }}</span>
                  </div>

                  <!-- Grade Label Center -->
                  <div class="grade-label">
                    {{ row.gradeLabel }}
                  </div>

                  <!-- Bars Right -->
                  <div class="bars-col">
                    <div class="stacked-bar">
                      <!-- RP -->
                      @if (row.rp > 0) {
                        <div
                          class="bar-seg redpoint"
                          [style.width.%]="(row.rp / dist.maxCount) * 100"
                          [tuiHint]="
                            ('ascentTypes.rp' | translate) + ': ' + row.rp
                          "
                        ></div>
                      }
                      <!-- Flash -->
                      @if (row.flash > 0) {
                        <div
                          class="bar-seg flash"
                          [style.width.%]="(row.flash / dist.maxCount) * 100"
                          [tuiHint]="
                            ('ascentTypes.f' | translate) + ': ' + row.flash
                          "
                        ></div>
                      }
                      <!-- OS -->
                      @if (row.os > 0) {
                        <div
                          class="bar-seg onsight"
                          [style.width.%]="(row.os / dist.maxCount) * 100"
                          [tuiHint]="
                            ('ascentTypes.os' | translate) + ': ' + row.os
                          "
                        ></div>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (dist.hasMore && !showAllGrades()) {
                <div
                  style="display: flex; justify-content: center; margin-top: 1rem;"
                >
                  <button
                    tuiButton
                    type="button"
                    appearance="action-grayscale"
                    size="s"
                    (click)="showAllGrades.set(true)"
                  >
                    {{ 'labels.showMore' | translate }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <div class="no-data">
              {{ 'statistics.noData' | translate }}
            </div>
          }
        </tui-loader>
      </section>

      <!-- Yearly Trend -->
      <section class="card">
        <header class="header">
          <h3 tuiTitle>{{ 'statistics.sportClimbingTrend' | translate }}</h3>
        </header>

        <tui-loader [showLoader]="statsResource.isLoading()">
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
        </tui-loader>
      </section>
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
  `,
})
export class UserStatisticsComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly translate = inject(TranslateService);
  userId = input.required<string>();

  // --- Date Filter Support ---
  readonly dateFilterControl = new FormControl('all_time');
  readonly showAllGrades = signal(false);

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
  private rawStats = computed(
    () => (this.statsResource.value() as UserAscentStatRecord[]) ?? [],
  );

  // Filtered Stats
  stats = computed(() => {
    const all = this.rawStats();
    return this.filterAscentsByDate(all, this.dateFilterSignal());
  });

  private dateFilterSignal = signal<string>('all_time');

  constructor() {
    // Sync form control to signal
    this.dateFilterControl.valueChanges.subscribe((val) => {
      this.dateFilterSignal.set(val || 'all_time');
    });
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
      { os: number; flash: number; rp: number; total: number; label: string }
    >();

    let totalAscents = 0;

    stats.forEach((ascent: UserAscentStatRecord) => {
      let gradeId = ascent.ascent_grade;
      if (!gradeId && ascent.route_grade) gradeId = ascent.route_grade;
      if (!gradeId) return;

      const label = VERTICAL_LIFE_TO_LABEL[gradeId as VERTICAL_LIFE_GRADES];
      if (!label) return;

      if (!buckets.has(gradeId)) {
        buckets.set(gradeId, { os: 0, flash: 0, rp: 0, total: 0, label });
      }

      const bucket = buckets.get(gradeId)!;
      bucket.total++;
      totalAscents++;

      const type = (ascent.ascent_type || 'rp').toLowerCase(); // default to rp if missing
      // 8a.nu often maps 'ticket'? Assuming straightforward mapping.
      // Using AscentsService logic or types.
      if (type === 'os' || type === 'onsight') bucket.os++;
      else if (type === 'f' || type === 'flash') bucket.flash++;
      else bucket.rp++; // Redpoint, Pinkpoint, Toprope(valid?)
      // 8a pyramid usually groups Redpoint/Toprope together visually as 'Red' or 'Pink'.
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
      return {
        gradeLabel: b.label,
        os: b.os,
        flash: b.flash,
        rp: b.rp,
        total: b.total,
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
      .map((a: UserAscentStatRecord) => {
        let gradeId = a.ascent_grade;
        if (!gradeId && a.route_grade) gradeId = a.route_grade;
        const name = a.route_name || 'Unknown Route';

        if (!gradeId)
          return {
            name,
            gradeLabel: '?',
            score: 0,
            type: (a.ascent_type || 'rp') as AscentType,
            areaSlug: '',
            cragSlug: '',
            routeSlug: '',
          };

        return {
          name,
          gradeLabel:
            VERTICAL_LIFE_TO_LABEL[gradeId as VERTICAL_LIFE_GRADES] || '?',
          score: this.getScore(gradeId, (a.ascent_type || 'rp') as AscentType),
          type: (a.ascent_type || 'rp') as AscentType,
          areaSlug: a.area_slug || '',
          cragSlug: a.crag_slug || '',
          routeSlug: a.route_slug || '',
        };
      })
      .filter((a: RouteScore) => a.score > 0);

    validAscents.sort((a: RouteScore, b: RouteScore) => b.score - a.score);
    const top10 = validAscents.slice(0, 10);
    const totalScore = top10.reduce(
      (sum: number, a: RouteScore) => sum + a.score,
      0,
    );

    return { score: totalScore, topRoutes: top10 };
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
