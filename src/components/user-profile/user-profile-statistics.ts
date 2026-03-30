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

import { UserAscentStatRecord } from '../../models';
import {
  GradeDistribution,
  AscentTypeDistribution,
  TrendData,
  TrendDetail,
} from '../../models/user-stats.model';
import {
  calculateAscentTypeDistribution,
  calculateGradeDistribution,
  calculatePeriodScore,
  calculateTrendSource,
  filterAscentsByDate,
  getMaxGrade,
} from '../../utils';

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
  ascentTypeDistribution = computed<AscentTypeDistribution>(() => {
    return calculateAscentTypeDistribution(this.stats());
  });

  constructor() {
    // Sync form control to signal
    this.dateFilterControl.valueChanges.subscribe((val) => {
      this.dateFilterSignal.set(val || 'last_12_months');
    });
  }

  // --- Grade Distribution Logic (Pyramid) ---
  gradeDistribution = computed<GradeDistribution>(() => {
    const limit = this.showAllGrades() ? undefined : 8;
    return calculateGradeDistribution(this.stats(), limit);
  });

  // --- Trend Logic ---

  // Chart Dimensions (Pixels)
  readonly width = 1000;
  readonly height = 200;

  // Shared source for chart data to ensure sync between line chart and tooltip details
  private readonly chartSource = computed(() => {
    return calculateTrendSource(
      this.rawStats(),
      this.translate.instant('today'),
    );
  });

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
