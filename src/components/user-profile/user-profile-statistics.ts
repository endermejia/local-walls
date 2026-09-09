import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';

import { TuiPoint, TuiScrollbar } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { FilterStateService } from '../../services/filter-state.service';
import { LayoutService } from '../../services/layout.service';
import { ProfileDataService } from '../../services/profile-data.service';
import { SupabaseService } from '../../services/supabase.service';

import {
  ClimbingKind,
  ClimbingKinds,
  GradeDistribution,
  LABEL_TO_VERTICAL_LIFE,
  ORDERED_GRADE_VALUES,
  TrendData,
  TrendDetail,
  UserAscentStatRecord,
} from '../../models';

import {
  calculateGradeDistribution,
  calculatePeriodScore,
  calculateTrendSource,
  filterAscentsByDate,
  getMaxGrade,
  getMaxGradeRoutes,
  safeResourceValue,
} from '../../utils';

import { UserProfileStatsPyramidComponent } from './statistics/grade-pyramid';

import { UserProfileStatsScoreComponent } from './statistics/score-card';

import { UserProfileStatsTrendsComponent } from './statistics/yearly-trend';

@Component({
  selector: 'app-user-profile-statistics',
  standalone: true,
  imports: [
    TuiScrollbar,
    UserProfileStatsPyramidComponent,
    UserProfileStatsScoreComponent,
    UserProfileStatsTrendsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 lg:flex lg:flex-col lg:h-full lg:min-h-0',
  },
  template: `
    <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
      <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
        <div class="flex flex-col gap-6 w-full min-w-0 p-1 pr-3 sm:pr-4 pb-6">
          <!-- Top Section: Pyramid (Left ~60%) + Score Card (Right ~40%) -->
          <div
            class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch w-full min-w-0"
          >
            <!-- Left Column: Grade Pyramid (Stretches full height on xl+) -->
            <div
              class="order-2 xl:order-1 xl:col-span-7 min-w-0 w-full xl:h-full flex flex-col"
            >
              <app-user-profile-stats-pyramid
                [(showAllGrades)]="showAllGrades"
                [distribution]="gradeDistribution()"
                [loading]="statsResource.isLoading()"
              />
            </div>

            <!-- Right Column: Score Card & Key Stats -->
            <div
              class="order-1 xl:order-2 xl:col-span-5 flex flex-col gap-4 min-w-0 w-full"
            >
              <app-user-profile-stats-score
                [totalScore]="totalScore()"
                [topRoutes]="topRoutes()"
                [totalAscents]="gradeDistribution().total"
                [rpCount]="gradeDistribution().rp"
                [flashCount]="gradeDistribution().flash"
                [osCount]="gradeDistribution().os"
                [maxRedpoint]="maxRedpoint()"
                [maxRedpointRoutes]="maxRedpointRoutes()"
                [maxOnsight]="maxOnsight()"
                [maxOnsightRoutes]="maxOnsightRoutes()"
                [maxFlash]="maxFlash()"
                [maxFlashRoutes]="maxFlashRoutes()"
              />
            </div>
          </div>

          <!-- Full Width: Evolution / Trend Chart -->
          <div class="w-full min-w-0">
            <app-user-profile-stats-trends
              [trendData]="trendData()"
              [trendDetails]="trendDetails()"
              [trendXLabels]="trendXLabels()"
              [width]="width"
              [height]="height"
            />
          </div>
        </div>
      </tui-scrollbar>
    </div>
  `,
})
export class UserProfileStatisticsComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly filterState = inject(FilterStateService);
  private readonly translate = inject(TranslateService);
  protected readonly profileData = inject(ProfileDataService);
  protected readonly layout = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);

  userId = input.required<string | undefined>();

  // --- Shared Date Filter Support ---
  readonly dateFilterValue = this.profileData.ascentsDateFilter;
  readonly showAllGrades = signal(false);

  // --- Data Loading ---
  statsResource = resource({
    params: () => ({
      userId: this.userId(),
      dateFilter: this.dateFilterValue(),
    }),
    loader: async ({ params }) => {
      if (!params.userId) return [];
      try {
        return await this.ascentsService.getUserStats(params.userId);
      } catch {
        return [];
      }
    },
  });

  // Create a filtered signal based on the control
  private rawStats = computed(() => {
    const data =
      safeResourceValue<UserAscentStatRecord[]>(this.statsResource, []) ?? [];
    return data.filter((a) => a.ascent_type !== 'attempt');
  });

  // Filtered Stats (for pyramid, score card, etc. - respects date filter)
  stats = computed(() => {
    const dateFiltered = filterAscentsByDate(
      this.rawStats(),
      this.dateFilterValue(),
    );
    const [minGradeIndex, maxGradeIndex] =
      this.filterState.profileAscentsGradeRange();
    const categories = this.filterState.profileAscentsCategories();
    const showIndoor = this.filterState.profileAscentsShowIndoor();
    const showOutdoor = this.filterState.profileAscentsShowOutdoor();

    const allowedGrades =
      minGradeIndex === 0 && maxGradeIndex === ORDERED_GRADE_VALUES.length - 1
        ? null
        : new Set(
            ORDERED_GRADE_VALUES.slice(minGradeIndex, maxGradeIndex + 1)
              .map((grade) => LABEL_TO_VERTICAL_LIFE[grade])
              .filter((grade): grade is number => grade !== undefined),
          );
    const allowedKinds = categories.length
      ? new Set(
          categories
            .map(
              (category) =>
                [
                  ClimbingKinds.SPORT,
                  ClimbingKinds.BOULDER,
                  ClimbingKinds.MULTIPITCH,
                ][category] as ClimbingKind | undefined,
            )
            .filter((kind): kind is ClimbingKind => kind !== undefined),
        )
      : null;

    return dateFiltered.filter(
      (ascent) =>
        ((showIndoor && showOutdoor) ||
          (!showIndoor && !showOutdoor) ||
          (showIndoor && ascent.is_indoor) ||
          (showOutdoor && !ascent.is_indoor)) &&
        (!allowedGrades || allowedGrades.has(ascent.route_grade)) &&
        (!allowedKinds ||
          (ascent.climbing_kind != null &&
            allowedKinds.has(ascent.climbing_kind as ClimbingKind))),
    );
  });

  // Stats for trend chart (no date filter, but respects other filters)
  statsForTrend = computed(() => {
    const [minGradeIndex, maxGradeIndex] =
      this.filterState.profileAscentsGradeRange();
    const categories = this.filterState.profileAscentsCategories();
    const showIndoor = this.filterState.profileAscentsShowIndoor();
    const showOutdoor = this.filterState.profileAscentsShowOutdoor();

    const allowedGrades =
      minGradeIndex === 0 && maxGradeIndex === ORDERED_GRADE_VALUES.length - 1
        ? null
        : new Set(
            ORDERED_GRADE_VALUES.slice(minGradeIndex, maxGradeIndex + 1)
              .map((grade) => LABEL_TO_VERTICAL_LIFE[grade])
              .filter((grade): grade is number => grade !== undefined),
          );
    const allowedKinds = categories.length
      ? new Set(
          categories
            .map(
              (category) =>
                [
                  ClimbingKinds.SPORT,
                  ClimbingKinds.BOULDER,
                  ClimbingKinds.MULTIPITCH,
                ][category] as ClimbingKind | undefined,
            )
            .filter((kind): kind is ClimbingKind => kind !== undefined),
        )
      : null;

    return this.rawStats().filter(
      (ascent) =>
        ((showIndoor && showOutdoor) ||
          (!showIndoor && !showOutdoor) ||
          (showIndoor && ascent.is_indoor) ||
          (showOutdoor && !ascent.is_indoor)) &&
        (!allowedGrades || allowedGrades.has(ascent.route_grade)) &&
        (!allowedKinds ||
          (ascent.climbing_kind != null &&
            allowedKinds.has(ascent.climbing_kind as ClimbingKind))),
    );
  });

  // --- Computed Signals for Dashboard ---

  // 1. Total Score & Top Routes for the selected period
  periodScoreData = computed(() => {
    return calculatePeriodScore(this.stats());
  });

  totalScore = computed(() => this.periodScoreData().score);
  topRoutes = computed(() => this.periodScoreData().topRoutes);

  // 2. Max Grades (RP, OS, Flash)
  maxRedpoint = computed(() => getMaxGrade(this.stats(), ['rp']));
  maxRedpointRoutes = computed(() => getMaxGradeRoutes(this.stats(), ['rp']));

  maxOnsight = computed(() => getMaxGrade(this.stats(), ['os', 'onsight']));
  maxOnsightRoutes = computed(() =>
    getMaxGradeRoutes(this.stats(), ['os', 'onsight']),
  );

  maxFlash = computed(() => getMaxGrade(this.stats(), ['f', 'flash']));
  maxFlashRoutes = computed(() =>
    getMaxGradeRoutes(this.stats(), ['f', 'flash']),
  );

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
      this.statsForTrend(),
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

  trendXLabels = computed(() => {
    const years = this.trendData().years;
    if (years.length === 0) return [];

    const isMobile = this.layout.isMobile();
    const maxLabels = isMobile ? 5 : 10;

    if (years.length <= maxLabels) return years;

    const step = (years.length - 1) / (maxLabels - 1);
    const indices = new Set<number>();

    for (let i = 0; i < maxLabels; i++) {
      indices.add(Math.round(i * step));
    }

    return years.map((y, index) => (indices.has(index) ? y : ''));
  });
}
