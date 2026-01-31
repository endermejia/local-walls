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
  GradeLabel,
  RouteAscentWithExtras,
  RoutesByGrade,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { computeGradeChartData } from '../utils';

@Component({
  selector: 'app-chart-ascents-by-grade',
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
    `,
  ],
  template: `
    @let c = chart();
    @if (isBrowser) {
      <tui-ring-chart
        [tuiSkeleton]="tuiSkeleton()"
        [value]="c.values.length && c.total > 0 ? c.values : [1]"
        [activeItemIndex]="activeItemIndex()"
        [class.!opacity-20]="c.total === 0"
        (activeItemIndexChange)="onActiveItemIndexChange($event)"
      >
        @if (c.hasActive) {
          <span>
            {{ c.activeBandTotal }}
            {{ 'labels.ascents' | translate | lowercase }}
          </span>
          <div [innerHtml]="c.breakdownText"></div>
        } @else {
          <span class="text-xl font-semibold">
            {{ gradeLabel() }}
          </span>
          @if (c.gradeRange; as gradeRange) {
            <div class="text-sm">{{ gradeRange }}</div>
          }
        }
      </tui-ring-chart>
    }
  `,
})
export class ChartAscentsByGradeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly isBrowser = isPlatformBrowser(this.platformId);

  ascents: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();
  gradeLabel: InputSignal<string> = input.required<string>();
  tuiSkeleton: InputSignal<boolean> = input(false);
  activeItemIndex: WritableSignal<number> = signal<number>(-1);

  // Compute counts directly from the ascents list
  private readonly normalizedCounts: Signal<RoutesByGrade> = computed(() => {
    const counts: RoutesByGrade = {};
    for (const ascent of this.ascents()) {
      const displayGrade = ascent.grade ?? ascent.route?.grade;
      const g = VERTICAL_LIFE_TO_LABEL[displayGrade as VERTICAL_LIFE_GRADES];
      if (g) {
        const gradeLabel = g as GradeLabel;
        counts[gradeLabel] = (counts[gradeLabel] ?? 0) + 1;
      }
    }
    return counts;
  });

  protected readonly chart = computed(() =>
    computeGradeChartData(this.normalizedCounts(), this.activeItemIndex()),
  );

  protected onActiveItemIndexChange(index: number): void {
    const value = this.chart().values[index] ?? 0;
    this.activeItemIndex.set(value > 0 ? index : -1);
  }
}
