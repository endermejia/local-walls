import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

import { TuiRingChart } from '@taiga-ui/addon-charts';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AmountByEveryGrade,
  normalizeRoutesByGrade,
  RoutesByGrade,
} from '../models';

import { computeGradeChartData } from '../utils';

@Component({
  selector: 'app-chart-routes-by-grade',
  standalone: true,
  imports: [TranslatePipe, TuiRingChart, LowerCasePipe, TuiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: [
    `
      :host {
        /* Chart categorical palette mapped to difficulty bands: 5, 6, 7, 8, 9 */
        --tui-chart-categorical-00: var(--tui-text-positive); /* < 6a */
        --tui-chart-categorical-01: var(--tui-status-info); /* 6a–6c+ */
        --tui-chart-categorical-02: var(--tui-status-warning); /* 7a–7c+ */
        --tui-chart-categorical-03: var(--tui-status-negative); /* 8a–8c+ */
        --tui-chart-categorical-04: var(
          --tui-background-accent-opposite
        ); /* 9a–9c */
      }

      .legend .item {
        margin: 0 0.5rem 0.75rem 0;
      }
    `,
  ],
  template: `
    @let c = chart();
    @if (isBrowser && c.total > 0) {
      <tui-ring-chart
        [tuiSkeleton]="tuiSkeleton()"
        [value]="c.values"
        [activeItemIndex]="activeItemIndex()"
        (activeItemIndexChange)="activeItemIndex.set($event)"
      >
        @if (c.hasActive) {
          <span>
            {{ c.activeBandTotal }}
            {{ 'labels.routes' | translate | lowercase }}
          </span>
          <div [innerHtml]="c.breakdownText"></div>
        } @else {
          <span class="text-xl font-semibold">
            {{ c.total }}
            {{ 'labels.routes' | translate | lowercase }}
          </span>
          @if (c.gradeRange; as gradeRange) {
            <div class="text-sm">{{ gradeRange }}</div>
          }
        }
      </tui-ring-chart>
    }
  `,
})
export class ChartRoutesByGradeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly isBrowser = isPlatformBrowser(this.platformId);

  grades: InputSignal<AmountByEveryGrade> =
    input.required<AmountByEveryGrade>();
  tuiSkeleton: InputSignal<boolean> = input(false);
  activeItemIndex: WritableSignal<number> = signal<number>(-1);

  // Normalize input (AmountByEveryVerticalLifeGrade) into a label-based record for charting
  private readonly normalizedCounts: Signal<RoutesByGrade> = computed(() =>
    normalizeRoutesByGrade(this.grades()),
  );

  protected readonly chart = computed(() =>
    computeGradeChartData(this.normalizedCounts(), this.activeItemIndex()),
  );
}
