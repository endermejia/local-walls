import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CountUpDirective } from '../../../directives/count-up.directive';

@Component({
  selector: 'app-user-profile-stats-score',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, CountUpDirective],
  template: `
    <div class="grid gap-6">
      <!-- Score Card -->
      <div
        class="bg-[var(--tui-background-base)] shadow-md rounded-2xl p-6 text-center border border-[var(--tui-border-normal)]"
      >
        <div
          class="text-[var(--tui-text-tertiary)] uppercase text-sm font-bold tracking-wider mb-2"
        >
          {{ 'statistics.totalScore' | translate }}
        </div>
        <div
          class="text-6xl font-black tabular-nums tracking-tight"
          [appCountUp]="totalScore()"
          #totalScoreAnim="appCountUp"
        >
          {{ totalScoreAnim.currentValue() | number: '1.0-0' }}
        </div>
        <div class="text-[var(--tui-text-tertiary)] mt-2 text-sm">
          {{ 'statistics.top10Ascents' | translate }}
        </div>
      </div>

      <!-- Key Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
        >
          <div
            class="text-3xl font-bold"
            [appCountUp]="totalAscents()"
            #totalAscentsAnim="appCountUp"
          >
            {{ totalAscentsAnim.currentValue() | number: '1.0-0' }}
          </div>
          <div class="text-xs uppercase opacity-70 font-semibold">
            {{ 'ascents' | translate }}
          </div>
        </div>
        <div
          class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
        >
          <div class="text-3xl font-bold text-[var(--tui-status-negative)]">
            {{ maxRedpoint() || '-' }}
          </div>
          <div class="text-xs uppercase opacity-70 font-semibold">
            {{ 'ascentTypes.rp' | translate }}
          </div>
        </div>
        <div
          class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
        >
          <div class="text-3xl font-bold text-[var(--tui-status-positive)]">
            {{ maxOnsight() || '-' }}
          </div>
          <div class="text-xs uppercase opacity-70 font-semibold">
            {{ 'ascentTypes.os' | translate }}
          </div>
        </div>
        <div
          class="bg-[var(--tui-background-base)] shadow-sm p-4 rounded-xl border border-[var(--tui-border-normal)] flex flex-col items-center justify-center gap-1"
        >
          <div class="text-3xl font-bold text-[var(--tui-status-warning)]">
            {{ maxFlash() || '-' }}
          </div>
          <div class="text-xs uppercase opacity-70 font-semibold">
            {{ 'ascentTypes.f' | translate }}
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileStatsScoreComponent {
  totalScore = input.required<number>();
  totalAscents = input.required<number>();
  maxRedpoint = input.required<string | null>();
  maxOnsight = input.required<string | null>();
  maxFlash = input.required<string | null>();
}
