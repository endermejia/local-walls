import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TuiAxes,
  TuiLineChart,
  TuiLineChartHint,
} from '@taiga-ui/addon-charts';
import { TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TrendData, TrendDetail } from '../../../models/user-stats.model';

@Component({
  selector: 'app-user-profile-stats-trends',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TuiAxes,
    TuiLineChart,
    TuiLineChartHint,
    TuiIcon,
    TuiScrollbar,
    TranslatePipe,
    RouterLink,
  ],
  template: `
    <div
      class="bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)]"
    >
      <header class="mb-4">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <tui-icon icon="@tui.chart-line" />
          {{ 'statistics.sportClimbingTrend' | translate }}
        </h3>
      </header>

      @if (trendData().years.length > 0) {
        <div class="relative pt-6 pb-2">
          <tui-axes
            class="chart-container"
            [axisXLabels]="trendXLabels()"
            [axisYLabels]="trendYLabels()"
            [verticalLines]="trendXLabels().length"
            [horizontalLines]="5"
            [tuiLineChartHint]="trendHintContent"
          >
            <!-- Total Score Trend -->
            <tui-line-chart
              [value]="trendData().series"
              [x]="0"
              [y]="0"
              [width]="width()"
              [height]="height()"
              [xStringify]="null"
              [yStringify]="null"
              [dots]="true"
              [filled]="true"
              style="color: var(--tui-status-info)"
            ></tui-line-chart>
          </tui-axes>
        </div>
      } @else {
        <div class="no-data opacity-50 text-center py-10">
          {{ 'statistics.noData' | translate }}
        </div>
      }
    </div>

    <!-- Hint content for Line Chart -->
    <ng-template #trendHintContent let-points let-index="index">
      <div class="trend-hint">
        @let i = getIndex(index);
        @let details = trendDetails()[i];

        <div class="trend-hint-header">
          <span class="trend-hint-year">{{ trendData().years[i] }}</span>
          <span class="trend-hint-score">
            {{ (details?.totalScore | number) || 0 }} {{ 'points' | translate }}
          </span>
        </div>

        @if (details) {
          <tui-scrollbar class="trend-scroll">
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
          </tui-scrollbar>
        }
      </div>
    </ng-template>
  `,
  styles: `
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
    .trend-scroll {
      max-height: 250px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileStatsTrendsComponent {
  trendData = input.required<TrendData>();
  trendDetails = input.required<TrendDetail[]>();
  trendXLabels = input.required<string[]>();
  trendYLabels = input.required<string[]>();
  width = input.required<number>();
  height = input.required<number>();

  getIndex(
    context: number | { index: number } | { $implicit: number } | unknown,
  ): number {
    if (typeof context === 'number') {
      return context;
    }
    if (
      context &&
      typeof context === 'object' &&
      'index' in context &&
      typeof context.index === 'number'
    ) {
      return context.index;
    }
    if (
      context &&
      typeof context === 'object' &&
      '$implicit' in context &&
      typeof context.$implicit === 'number'
    ) {
      return context.$implicit;
    }
    return 0;
  }
}
