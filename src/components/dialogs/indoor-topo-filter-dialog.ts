import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  type TuiDialogContext,
  type TuiKeySteps,
  TuiButton,
  TuiCheckbox,
  TuiLink,
} from '@taiga-ui/core';
import { TuiRange } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import { ORDERED_GRADE_VALUES } from '../../models';

import { TopoIsRouteVisiblePipe } from '../../pipes';
import { clamp } from '../../utils';

export interface IndoorTopoFilterRouteItem {
  id: string | number;
  name: string;
  moves: number;
}

export interface IndoorTopoFilterDialogData {
  gradeRange: [number, number];
  movesRange: [number, number];
  maxPossibleMoves: number;
  hiddenRouteIds: (string | number)[];
  routes: IndoorTopoFilterRouteItem[];
}

export interface IndoorTopoFilterDialogResult {
  gradeRange: [number, number];
  movesRange: [number, number];
  hiddenRouteIds: (string | number)[];
}

@Component({
  selector: 'app-indoor-topo-filter-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TopoIsRouteVisiblePipe,
    TranslatePipe,
    TuiButton,
    TuiCheckbox,
    TuiLink,
    TuiRange,
  ],
  template: `
    <form
      class="flex flex-col gap-6"
      [formGroup]="form"
      (submit.prevent)="apply()"
    >
      <!-- Grade Range -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-semibold text-sm">{{ 'grade' | translate }}</span>
          <div class="flex items-center gap-1 font-medium text-sm">
            <span>{{ selectedMinGradeLabel() }}</span>
            <span>-</span>
            <span>{{ selectedMaxGradeLabel() }}</span>
          </div>
        </div>
        <tui-range
          id="indoor-grade-range"
          [style.--tui-thumb-size.rem]="0.75"
          [min]="minGradeIndex"
          [max]="maxGradeIndex"
          [step]="1"
          [segments]="gradeSegments"
          [keySteps]="gradeKeySteps"
          [attr.aria-label]="'grade' | translate"
          formControlName="gradeRange"
        />
        <div
          class="hidden sm:flex flex-wrap gap-2 justify-between text-xs opacity-60 mt-1"
        >
          @for (label of gradeTickLabels; track label; let i = $index) {
            <a
              tuiLink
              appearance="action-grayscale"
              role="button"
              tabindex="0"
              (click.zoneless)="onGradeTickClick(gradeKeySteps[i][1])"
              (keydown.enter)="onGradeTickClick(gradeKeySteps[i][1])"
              >{{ label }}</a
            >
          }
        </div>
      </section>

      <!-- Moves Range -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-semibold text-sm">{{ 'moves' | translate }}</span>
          <div class="flex items-center gap-1 font-medium text-sm">
            <span>{{ selectedMinMoves() }}</span>
            <span>-</span>
            <span>{{ selectedMaxMoves() }}</span>
            <span class="opacity-70 text-xs">
              {{ 'moves' | translate }}
            </span>
          </div>
        </div>
        <tui-range
          id="indoor-moves-range"
          [style.--tui-thumb-size.rem]="0.75"
          [min]="0"
          [max]="maxPossibleMoves"
          [step]="1"
          [segments]="movesSegments"
          [attr.aria-label]="'moves' | translate"
          formControlName="movesRange"
        />
        <div class="flex justify-between text-xs opacity-50 mt-1">
          <span>0</span>
          <span>{{ maxPossibleMoves }}</span>
        </div>
      </section>

      <!-- Routes Visibility -->
      @if (routes.length > 0) {
        <section class="flex flex-col gap-2">
          <div
            class="flex items-center justify-between gap-2 pb-1.5 border-b border-(--tui-border-normal)"
          >
            <span class="font-semibold text-sm">{{
              'routes' | translate
            }}</span>
            <div class="flex items-center gap-1">
              <button
                tuiButton
                appearance="flat"
                size="xs"
                type="button"
                (click.zoneless)="showAllRoutes()"
              >
                {{ 'showAll' | translate }}
              </button>
              <button
                tuiButton
                appearance="flat"
                size="xs"
                type="button"
                (click.zoneless)="hideAllRoutes()"
              >
                {{ 'hideAll' | translate }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            @for (r of routes; track r.id) {
              @let isVisible = r.id | topoIsRouteVisible: hiddenRouteIds();
              <label
                class="flex items-center gap-2.5 p-1.5 rounded hover:bg-(--tui-background-neutral-1) cursor-pointer text-sm"
              >
                <input
                  tuiCheckbox
                  type="checkbox"
                  [ngModel]="isVisible"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="onRouteVisibilityChange(r.id, $event)"
                />
                <span class="truncate font-medium flex-1">{{ r.name }}</span>
                <span class="text-xs opacity-60 shrink-0"
                  >{{ r.moves }} mov.</span
                >
              </label>
            }
          </div>
        </section>
      }

      <!-- Footer Buttons -->
      <footer
        class="flex flex-wrap gap-2 justify-end items-center mt-2 pt-3 border-t border-(--tui-border-normal)"
      >
        <button
          appearance="secondary"
          tuiButton
          type="button"
          (click.zoneless)="clear()"
        >
          {{ 'clear' | translate }}
        </button>
        <button tuiButton type="submit">
          {{ 'apply' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorTopoFilterDialogComponent {
  protected readonly context =
    injectContext<
      TuiDialogContext<IndoorTopoFilterDialogResult, IndoorTopoFilterDialogData>
    >();

  protected readonly minGradeIndex = 0;
  protected readonly maxGradeIndex = ORDERED_GRADE_VALUES.length - 2;
  protected readonly gradeSegments = 8;

  protected readonly maxPossibleMoves = Math.max(
    this.context.data?.maxPossibleMoves ?? 0,
    1,
  );

  protected readonly movesSegments = Math.min(
    Math.max(this.maxPossibleMoves, 1),
    10,
  );

  protected readonly gradeKeySteps: TuiKeySteps = [
    [0, 0],
    ...Array.from({ length: this.gradeSegments - 1 }, (_, i) => {
      const percent = (100 / this.gradeSegments) * (i + 1);
      const idx = Math.round(this.maxGradeIndex * (percent / 100));
      return [percent, idx] satisfies [number, number];
    }),
    [100, this.maxGradeIndex],
  ];

  protected readonly gradeTickLabels: string[] = this.gradeKeySteps.map(
    ([, idx]: [number, number]) => ORDERED_GRADE_VALUES[idx] ?? '',
  );

  protected readonly routes: IndoorTopoFilterRouteItem[] =
    this.context.data?.routes ?? [];

  protected readonly hiddenRouteIds = signal<Set<string | number>>(
    new Set(this.context.data?.hiddenRouteIds ?? []),
  );

  protected readonly form = new FormGroup({
    gradeRange: new FormControl<[number, number]>(
      this.sanitizeGradeRange(
        this.context.data?.gradeRange ?? [
          this.minGradeIndex,
          this.maxGradeIndex,
        ],
      ),
      { nonNullable: true },
    ),
    movesRange: new FormControl<[number, number]>(
      this.sanitizeMovesRange(
        this.context.data?.movesRange ?? [0, this.maxPossibleMoves],
      ),
      { nonNullable: true },
    ),
  });

  protected readonly gradeRangeSignal: Signal<[number, number]> = toSignal(
    this.form.controls.gradeRange.valueChanges.pipe(
      startWith(this.form.controls.gradeRange.value),
      map((v) =>
        this.sanitizeGradeRange(v ?? [this.minGradeIndex, this.maxGradeIndex]),
      ),
    ),
    { initialValue: this.form.controls.gradeRange.value },
  );

  protected readonly movesRangeSignal: Signal<[number, number]> = toSignal(
    this.form.controls.movesRange.valueChanges.pipe(
      startWith(this.form.controls.movesRange.value),
      map((v) => this.sanitizeMovesRange(v ?? [0, this.maxPossibleMoves])),
    ),
    { initialValue: this.form.controls.movesRange.value },
  );

  protected readonly selectedMinGradeLabel: Signal<string> = computed(() => {
    const [lo] = this.gradeRangeSignal();
    return ORDERED_GRADE_VALUES[lo] ?? '';
  });

  protected readonly selectedMaxGradeLabel: Signal<string> = computed(() => {
    const [, hi] = this.gradeRangeSignal();
    return ORDERED_GRADE_VALUES[hi] ?? '';
  });

  protected readonly selectedMinMoves: Signal<number> = computed(() => {
    return this.movesRangeSignal()[0];
  });

  protected readonly selectedMaxMoves: Signal<number> = computed(() => {
    return this.movesRangeSignal()[1];
  });

  protected onGradeTickClick(targetIdx: number): void {
    const current = (this.form.controls.gradeRange.value ?? [
      this.minGradeIndex,
      this.maxGradeIndex,
    ]) as [number, number];
    const [lo, hi] = current;
    const t = clamp(targetIdx, this.minGradeIndex, this.maxGradeIndex);
    const moveMin = Math.abs(t - lo) <= Math.abs(t - hi);
    const next: [number, number] = moveMin ? [t, hi] : [lo, t];
    this.form.controls.gradeRange.setValue(this.sanitizeGradeRange(next));
  }

  protected onRouteVisibilityChange(
    routeId: string | number,
    visible: boolean,
  ): void {
    this.hiddenRouteIds.update((set) => {
      const next = new Set(set);
      if (visible) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }

  protected toggleRoute(routeId: string | number): void {
    this.hiddenRouteIds.update((set) => {
      const next = new Set(set);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }

  protected showAllRoutes(): void {
    this.hiddenRouteIds.set(new Set());
  }

  protected hideAllRoutes(): void {
    const allIds = this.routes.map((r) => r.id);
    this.hiddenRouteIds.set(new Set(allIds));
  }

  protected clear(): void {
    this.form.reset({
      gradeRange: [this.minGradeIndex, this.maxGradeIndex],
      movesRange: [0, this.maxPossibleMoves],
    });
    this.hiddenRouteIds.set(new Set());
    this.context.completeWith({
      gradeRange: [this.minGradeIndex, this.maxGradeIndex],
      movesRange: [0, this.maxPossibleMoves],
      hiddenRouteIds: [],
    });
  }

  protected apply(): void {
    this.context.completeWith({
      gradeRange: this.sanitizeGradeRange(this.form.controls.gradeRange.value),
      movesRange: this.sanitizeMovesRange(this.form.controls.movesRange.value),
      hiddenRouteIds: Array.from(this.hiddenRouteIds()),
    });
  }

  private sanitizeGradeRange([a, b]: [number, number]): [number, number] {
    const lo = clamp(Math.round(a), this.minGradeIndex, this.maxGradeIndex);
    const hi = clamp(Math.round(b), this.minGradeIndex, this.maxGradeIndex);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }

  private sanitizeMovesRange([a, b]: [number, number]): [number, number] {
    const lo = clamp(Math.round(a), 0, this.maxPossibleMoves);
    const hi = clamp(Math.round(b), 0, this.maxPossibleMoves);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }
}
