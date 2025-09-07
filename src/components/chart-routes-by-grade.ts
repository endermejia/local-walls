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
import { TuiLegendItem, TuiRingChart } from '@taiga-ui/addon-charts';
import { TuiHovered } from '@taiga-ui/cdk';
import { ORDERED_GRADE_VALUES, Grade, RoutesByGrade } from '../models';
import { LowerCasePipe } from '@angular/common';

@Component({
  selector: 'app-chart-routes-by-grade',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiLegendItem,
    TuiRingChart,
    TuiHovered,
    LowerCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
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
    <div class="flex items-center gap-4">
      <tui-ring-chart
        [size]="size()"
        [value]="values()"
        [activeItemIndex]="activeItemIndex()"
        (activeItemIndexChange)="activeItemIndex.set($event)"
      >
        @let totalVias = total();
        @if (hasActive()) {
          <span>
            {{ totalVias }}
            {{ 'labels.routes' | translate | lowercase }}
          </span>
          <div [innerHtml]="breakdownText()"></div>
        } @else {
          @if (size() === 'm') {
            <span class="text-xl font-semibold">
              {{ total() }}
              {{ 'labels.routes' | translate | lowercase }}
            </span>
            <!-- Rango de grados presentes -->
            @if (gradeRange(); as gradeRange) {
              <div class="text-sm">{{ gradeRange }}</div>
            }
          } @else {
            <small class="text-nowrap">{{ totalVias }}</small>
          }
        }
      </tui-ring-chart>

      @if (showLegends()) {
        <div class="flex flex-row gap-2 flex-wrap">
          @for (label of legendLabels(); let index = $index; track index) {
            @if (values()[index] > 0) {
              <tui-legend-item
                size="s"
                class="item"
                [active]="activeItemIndex() === index"
                [text]="label"
                [color]="'var(--tui-chart-categorical-0' + index + ')'"
                (tuiHoveredChange)="onHover(index, $event)"
              >
                <span>{{ values()[index] || 0 }}</span>
              </tui-legend-item>
            }
          }
        </div>
      }
    </div>
  `,
})
export class ChartRoutesByGradeComponent {
  counts: InputSignal<RoutesByGrade> = input<RoutesByGrade>({});
  showLegends = input<boolean>(true);
  size = input<'s' | 'm'>('m');
  activeItemIndex: WritableSignal<number> = signal<number>(Number.NaN);

  private readonly allGrades = ORDERED_GRADE_VALUES;

  readonly legendLabels: Signal<readonly string[]> = computed(
    () => ['5:', '6:', '7:', '8:', '9:'] as const,
  );

  private bandForGrade(g: Grade): 0 | 1 | 2 | 3 | 4 {
    const base = parseInt(g.charAt(0), 10);
    if (!Number.isFinite(base)) return 0;
    if (base <= 5) return 0;
    if (base === 6) return 1;
    if (base === 7) return 2;
    if (base === 8) return 3;
    return 4; // 9
  }

  readonly values: Signal<readonly number[]> = computed(() => {
    const counts = this.counts();
    const bands = [0, 0, 0, 0, 0];
    for (const g of this.allGrades) {
      const v = counts[g] ?? 0;
      if (!v) continue;
      const b = this.bandForGrade(g);
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

  private gradesForBand(band: 0 | 1 | 2 | 3 | 4): readonly Grade[] {
    return this.allGrades.filter(
      (g) => this.bandForGrade(g) === band,
    ) as readonly Grade[];
  }

  readonly breakdown = computed(() => {
    const idx = this.activeItemIndex();
    if (!Number.isFinite(idx)) return [] as { grade: Grade; count: number }[];
    const counts = this.counts();
    const grades = this.gradesForBand(idx as 0 | 1 | 2 | 3 | 4);
    const items: { grade: Grade; count: number }[] = [];
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
    const counts = this.counts();
    const present = this.allGrades.filter((g) => (counts[g] ?? 0) > 0);
    if (present.length === 0) return '';
    const first = present[0];
    const last = present[present.length - 1];
    return first === last ? `${first}` : `${first} – ${last}`;
  });

  readonly breakdownText = computed(() => {
    const items = this.breakdown();
    if (items.length === 0) return '';
    return items
      .map(
        (it) =>
          `<span class="whitespace-nowrap">${it.grade}:</> <b>${it.count}</b></span>`,
      )
      .join(' | ');
  });

  onHover(index: number, hovered: boolean): void {
    this.activeItemIndex.set(hovered ? index : Number.NaN);
  }
}
