import { DecimalPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { TuiRingChart, TuiLegendItem } from '@taiga-ui/addon-charts';
import { TuiIcon } from '@taiga-ui/core';
import { TuiHovered } from '@taiga-ui/cdk';
import { TranslatePipe } from '@ngx-translate/core';
import { AscentTypeDistribution } from '../../../models/user-stats.model';
import { CountUpDirective } from '../../../directives/count-up.directive';

@Component({
  selector: 'app-user-profile-stats-styles',
  standalone: true,
  imports: [
    DecimalPipe,
    PercentPipe,
    TuiRingChart,
    TuiLegendItem,
    TuiIcon,
    TuiHovered,
    TranslatePipe,
    CountUpDirective,
  ],
  template: `
    <div
      class="bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)] flex flex-col items-center"
    >
      <h3 class="font-bold text-lg mb-4 self-start flex items-center gap-2">
        <tui-icon icon="@tui.chart-pie" />
        {{ 'statistics.styleDistribution' | translate }}
      </h3>

      @if (distribution()?.total ?? 0 > 0) {
        @let dist = distribution()!;
        <div class="relative w-48 h-48 my-4">
          <tui-ring-chart
            [value]="[dist.os, dist.flash, dist.rp]"
            size="l"
            class="w-full h-full"
            [activeItemIndex]="activeItemIndex()"
          >
            <div class="text-center">
              <div
                class="text-2xl font-bold"
                [appCountUp]="dist.total"
                #styleTotalAnim="appCountUp"
              >
                {{ styleTotalAnim.currentValue() | number: '1.0-0' }}
              </div>
              <div class="text-xs uppercase opacity-70">
                {{ 'ascents' | translate }}
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
              >{{ dist.os }} ({{
                dist.os / dist.total | percent: '1.0-1'
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
              >{{ dist.flash }} ({{
                dist.flash / dist.total | percent: '1.0-1'
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
              >{{ dist.rp }} ({{
                dist.rp / dist.total | percent: '1.0-1'
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
  `,
  styles: `
    :host {
      --tui-chart-categorical-00: var(--tui-status-positive); /* OS */
      --tui-chart-categorical-01: var(--tui-status-warning); /* Flash */
      --tui-chart-categorical-02: var(--tui-status-negative); /* Redpoint */
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileStatsStylesComponent {
  distribution = input.required<AscentTypeDistribution | null>();
  activeItemIndex = signal<number>(NaN);

  isItemActive(index: number): boolean {
    return isNaN(this.activeItemIndex()) || this.activeItemIndex() === index;
  }

  onHover(index: number, hovered: boolean): void {
    this.activeItemIndex.set(hovered ? index : NaN);
  }
}
