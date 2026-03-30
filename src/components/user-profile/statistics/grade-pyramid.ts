import { CommonModule, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon, TuiHint, TuiScrollbar, TuiButton } from '@taiga-ui/core';
import { GradeDistribution } from '../../../models/user-stats.model';

@Component({
  selector: 'app-user-profile-stats-pyramid',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LowerCasePipe,
    TuiIcon,
    TuiHint,
    TuiScrollbar,
    TuiButton,
    RouterLink,
  ],
  template: `
    <div
      class="bg-[var(--tui-background-base)] shadow-md p-6 rounded-2xl border border-[var(--tui-border-normal)]"
    >
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <tui-icon icon="@tui.pyramid" />
        {{ 'statistics.gradePyramid' | translate }}
      </h3>

      @if (distribution()?.total ?? 0 > 0) {
        @let dist = distribution()!;
        <div class="flex flex-col gap-2">
          @for (row of dist.rows; track row.gradeLabel) {
            <div
              class="grid grid-cols-[3rem_1fr_3rem] gap-3 items-center text-sm"
            >
              <div
                class="font-bold text-center text-[var(--tui-text-secondary)]"
              >
                {{ row.gradeLabel }}
              </div>
              <div
                class="h-6 flex rounded overflow-hidden relative mx-auto"
                [style.width.%]="(row.total / dist.maxCount) * 100"
                [tuiHint]="pyramidHint"
                [tuiHintContext]="{
                  label: row.gradeLabel,
                  total: row.total,
                  routes: row.allRoutes,
                }"
              >
                <!-- Background bar for context -->
                <div
                  class="absolute inset-0 opacity-10 bg-[var(--tui-text-primary)]"
                ></div>

                <!-- Segments -->
                @if (row.rp > 0) {
                  <div
                    class="bg-[var(--tui-status-negative)] h-full transition-all duration-500"
                    [style.width.%]="(row.rp / row.total) * 100"
                  ></div>
                }
                @if (row.flash > 0) {
                  <div
                    class="bg-[var(--tui-status-warning)] h-full transition-all duration-500"
                    [style.width.%]="(row.flash / row.total) * 100"
                  ></div>
                }
                @if (row.os > 0) {
                  <div
                    class="bg-[var(--tui-status-positive)] h-full transition-all duration-500"
                    [style.width.%]="(row.os / row.total) * 100"
                  ></div>
                }
              </div>
              <div class="font-mono text-center opacity-70">
                {{ row.total }}
              </div>
            </div>
          }

          @if (dist.hasMore && !showAllGrades()) {
            <div class="flex justify-center mt-4">
              <button
                tuiButton
                appearance="secondary"
                size="s"
                (click)="showAllGrades.set(true)"
              >
                {{ 'showMore' | translate }}
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="opacity-50 text-center py-10">
          {{ 'statistics.noData' | translate }}
        </div>
      }
    </div>

    <!-- Hint content for Pyramid Chart -->
    <ng-template
      #pyramidHint
      let-label="label"
      let-total="total"
      let-routes="routes"
    >
      <div class="trend-hint">
        <div class="trend-hint-header">
          <span class="trend-hint-year">
            {{ total }} {{ 'ascents' | translate | lowercase }}
          </span>
          <span class="trend-hint-score">
            {{ label }}
          </span>
        </div>

        <tui-scrollbar class="trend-scroll">
          <div class="trend-routes">
            @for (route of routes; track $index) {
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
      </div>
    </ng-template>
  `,
  styles: `
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
export class UserProfileStatsPyramidComponent {
  distribution = input.required<GradeDistribution | null>();
  showAllGrades = signal(false);
}
