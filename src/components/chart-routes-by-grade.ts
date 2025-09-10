import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  InputSignal,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiRingChart } from '@taiga-ui/addon-charts';
import {
  ORDERED_GRADE_VALUES,
  GradeLabel,
  RoutesByGrade,
  AmountByEveryVerticalLifeGrade,
  normalizeRoutesByGrade,
  bandForGradeLabel,
} from '../models';
import { LowerCasePipe } from '@angular/common';

@Component({
  selector: 'app-chart-routes-by-grade',
  standalone: true,
  imports: [TranslatePipe, TuiRingChart, LowerCasePipe],
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
    <tui-ring-chart
      [value]="values()"
      [activeItemIndex]="activeItemIndex()"
      (activeItemIndexChange)="activeItemIndex.set($event)"
    >
      @if (hasActive()) {
        <span>
          {{ activeBandTotal() }}
          {{ 'labels.routes' | translate | lowercase }}
        </span>
        <div [innerHtml]="breakdownText()"></div>
      } @else {
        <span class="text-xl font-semibold">
          {{ total() }}
          {{ 'labels.routes' | translate | lowercase }}
        </span>
        @if (gradeRange(); as gradeRange) {
          <div class="text-sm">{{ gradeRange }}</div>
        }
      }
    </tui-ring-chart>
  `,
})
export class ChartRoutesByGradeComponent {
  grades: InputSignal<AmountByEveryVerticalLifeGrade> =
    input.required<AmountByEveryVerticalLifeGrade>();
  activeItemIndex: WritableSignal<number> = signal<number>(Number.NaN);

  private readonly allGrades = ORDERED_GRADE_VALUES;

  // Normalize input (AmountByEveryVerticalLifeGrade) into label-based record for charting
  private readonly normalizedCounts: Signal<RoutesByGrade> = computed(() =>
    normalizeRoutesByGrade(this.grades()),
  );

  readonly values: Signal<readonly number[]> = computed(() => {
    const counts = this.normalizedCounts();
    const bands = [0, 0, 0, 0, 0];
    for (const g of this.allGrades) {
      const v = counts[g] ?? 0;
      if (!v) continue;
      const b = bandForGradeLabel(g);
      bands[b] += v;
    }
    return bands as readonly number[];
  });

  readonly total: Signal<number> = computed(() =>
    this.values().reduce((a, b) => a + b, 0),
  );
  readonly hasActive: Signal<boolean> = computed(() =>
    Number.isFinite(this.activeItemIndex()),
  );

  readonly activeBandTotal: Signal<number> = computed(() => {
    const idx = this.activeItemIndex();
    if (!Number.isFinite(idx)) return this.total();
    const vals = this.values();
    const i = idx as number;
    return (vals[i] ?? 0) as number;
  });

  private gradesForBand(band: 0 | 1 | 2 | 3 | 4): readonly GradeLabel[] {
    return this.allGrades.filter(
      (g) => bandForGradeLabel(g) === band,
    ) as readonly GradeLabel[];
  }

  readonly breakdown = computed(() => {
    const idx = this.activeItemIndex();
    if (!Number.isFinite(idx))
      return [] as { grade: GradeLabel; count: number }[];
    const counts = this.normalizedCounts();
    const grades = this.gradesForBand(idx as 0 | 1 | 2 | 3 | 4);
    const items: { grade: GradeLabel; count: number }[] = [];
    for (const g of grades) {
      const c = counts[g] ?? 0;
      if (c > 0) items.push({ grade: g, count: c });
    }
    return items;
  });

  /**
   * Range of grades present in the dataset.
   * Examples: "6b", "6b – 8a+". Empty string if there are no routes.
   */
  readonly gradeRange: Signal<string> = computed(() => {
    const counts = this.normalizedCounts();
    const present = this.allGrades.filter((g) => (counts[g] ?? 0) > 0);
    if (present.length === 0) return '';
    const first = present[0];
    const last = present[present.length - 1];
    return first === last ? `${first}` : `${first} – ${last}`;
  });

  readonly breakdownText = computed(() => {
    const idx = this.activeItemIndex();
    if (!Number.isFinite(idx)) return '';

    if (this.activeBandTotal() < 1000) {
      const items = this.breakdown();
      if (items.length === 0) return '';
      return items
        .map(
          (it) =>
            `<span class="whitespace-nowrap">${it.grade}:</> <b>${it.count}</b></span>`,
        )
        .join(' | ');
    }

    // Compact: show the grade range within the active band
    const counts = this.normalizedCounts();
    const grades = this.gradesForBand(idx as 0 | 1 | 2 | 3 | 4);
    const present = grades.filter((g) => (counts[g] ?? 0) > 0);
    if (present.length === 0) return '';
    const first = present[0];
    const last = present[present.length - 1];
    return first === last ? `${first}` : `${first} – ${last}`;
  });
}
