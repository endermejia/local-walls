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
  TuiDataList,
  TuiLoader,
  TuiTextfield,
  tuiHintOptionsProvider,
  TuiIcon,
  TuiPoint,
} from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import {
  AscentType,
  GRADE_NUMBER_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  UserAscentStatRecord,
  PROJECT_GRADE_LABEL,
  GradeLabel,
} from '../../models';
import {
  RouteScore,
  GradeDistribution,
  AscentTypeDistribution,
  TrendData,
  TrendDetail,
} from '../../models/user-stats.model';

import { UserProfileStatsScoreComponent } from './statistics/score-card';
import { UserProfileStatsPyramidComponent } from './statistics/grade-pyramid';
import { UserProfileStatsStylesComponent } from './statistics/style-distribution';
import { UserProfileStatsTrendsComponent } from './statistics/yearly-trend';

@Component({
  selector: 'app-user-profile-statistics',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiLoader,
    TuiSelect,
    TuiTextfield,
    TuiDataList,
    TuiDataListWrapper,
    TranslatePipe,
    TuiIcon,
    UserProfileStatsScoreComponent,
    UserProfileStatsPyramidComponent,
    UserProfileStatsStylesComponent,
    UserProfileStatsTrendsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
  providers: [
    tuiHintOptionsProvider({
      appearance: 'dark',
    }),
  ],
  template: `
    <div class="grid gap-4 max-w-7xl mx-auto">
      <!-- Header / Filter -->
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h2 class="text-2xl font-bold hidden sm:flex items-center gap-2">
          <tui-icon icon="@tui.chart-bar" />
          {{ 'statistics' | translate }}
        </h2>
        <tui-textfield
          class="w-full sm:w-48"
          [tuiTextfieldCleaner]="false"
          [stringify]="dateValueContent"
          tuiTextfieldSize="l"
        >
          <input
            tuiSelect
            [formControl]="dateFilterControl"
            autocomplete="off"
          />
          <tui-data-list *tuiTextfieldDropdown>
            <tui-data-list-wrapper new [items]="dateFilterOptions()" />
          </tui-data-list>
        </tui-textfield>
      </div>

      <tui-loader [showLoader]="statsResource.isLoading()">
        <div class="grid gap-6">
          <app-user-profile-stats-score
            [totalScore]="totalScore()"
            [totalAscents]="gradeDistribution().total"
            [maxRedpoint]="maxRedpoint()"
            [maxOnsight]="maxOnsight()"
            [maxFlash]="maxFlash()"
          />

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <app-user-profile-stats-pyramid
              class="lg:col-span-2"
              [distribution]="gradeDistribution()"
            />
            <app-user-profile-stats-styles
              [distribution]="ascentTypeDistribution()"
            />
          </div>

          <app-user-profile-stats-trends
            [trendData]="trendData()"
            [trendDetails]="trendDetails()"
            [trendXLabels]="trendXLabels()"
            [trendYLabels]="trendYLabels()"
            [width]="width"
            [height]="height"
          />
        </div>
      </tui-loader>
    </div>
  `,
})
export class UserProfileStatisticsComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly translate = inject(TranslateService);
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);

  userId = input.required<string | undefined>();

  // --- Date Filter Support ---
  readonly dateFilterControl = new FormControl('last_12_months');
  readonly showAllGrades = signal(false);

  readonly dateFilterOptions = computed(() => {
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
      if (!params.userId) return [];
      return await this.ascentsService.getUserStats(params.userId);
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
  ascentTypeDistribution = computed<AscentTypeDistribution>(() => {
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
      return GRADE_NUMBER_TO_LABEL[maxGradeId as VERTICAL_LIFE_GRADES] || null;
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
  gradeDistribution = computed<GradeDistribution>(() => {
    const stats = this.stats();
    if (stats.length === 0)
      return { rows: [], total: 0, maxCount: 0, hasMore: false };

    const buckets = new Map<
      number,
      {
        os: number;
        flash: number;
        rp: number;
        total: number;
        label: GradeLabel;
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

    if (buckets.size === 0)
      return { rows: [], total: 0, maxCount: 0, hasMore: false };

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

      const allRoutes = [...osRoutes, ...flashRoutes, ...rpRoutes].sort(
        (x, y) => y.score - x.score,
      );

      return {
        gradeLabel: b.label,
        os: b.os,
        flash: b.flash,
        rp: b.rp,
        total: b.total,
        osRoutes,
        flashRoutes,
        rpRoutes,
        allRoutes,
      };
    });

    return { rows, total: totalAscents, maxCount: maxBucketCount, hasMore };
  });

  // --- Trend Logic ---

  // Scoring Helpers
  private getScore(gradeId: number, type: AscentType): number {
    let bonus = 0;
    if (type === 'os') bonus = 100;
    else if (type === 'f') bonus = 50;

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
      label: this.translate.instant('today'),
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
        GRADE_NUMBER_TO_LABEL[gradeId as VERTICAL_LIFE_GRADES] ||
        PROJECT_GRADE_LABEL,
      gradeId: gradeId as number,
      score: this.getScore(gradeId, (a.ascent_type || 'rp') as AscentType),
      type: (a.ascent_type || 'rp') as AscentType,
      areaSlug: a.area_slug || '',
      cragSlug: a.crag_slug || '',
      routeSlug: a.route_slug || '',
    };
  }

  trendData = computed<TrendData>(() => {
    const source = this.chartSource();
    if (source.length === 0) return { years: [], series: [], maxY: 0, minY: 0 };

    const years = source.map((d) => d.label);
    const scores = source.map((d) => d.score);
    const realMin = Math.min(...scores);
    const realMax = Math.max(...scores);

    const range = realMax - realMin;
    const safeRange = range === 0 ? realMin * 0.1 || 100 : range;

    let domMin = Math.floor(realMin - safeRange * 0.2);
    if (domMin < 0) domMin = 0;

    const domMax = Math.ceil(realMax + safeRange * 0.1);
    const domRange = domMax - domMin;

    const series: TuiPoint[] = [];
    const xStep = years.length > 1 ? this.width / (years.length - 1) : 0;

    scores.forEach((score, index) => {
      const x = years.length > 1 ? index * xStep : this.width / 2;
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

  trendDetails = computed<TrendDetail[]>(() => {
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
    const count = 5;
    const step = (maxY - minY) / (count - 1 || 1);

    for (let i = 0; i < count; i++) {
      labels.push(Math.round(minY + i * step).toString());
    }
    return labels;
  });

  trendXLabels = computed(() => {
    const years = this.trendData().years;
    if (years.length === 0) return [];

    const isMobile = this.global.isMobile();
    const maxLabels = isMobile ? 5 : 10;

    if (years.length <= maxLabels) return years;

    const skip = Math.ceil(years.length / maxLabels);

    return years.map((year, i) => {
      if (i === 0 || i === years.length - 1 || i % skip === 0) {
        return year;
      }
      return '';
    });
  });
}
