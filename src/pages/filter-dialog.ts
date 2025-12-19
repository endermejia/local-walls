import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { TuiButton, TuiLink } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiRange, TuiFilter, type TuiKeySteps } from '@taiga-ui/kit';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ORDERED_GRADE_VALUES } from '../models';

export interface FilterDialog {
  categories: number[]; // 0=Sport, 1=Boulder, 2=Multipitch
  gradeRange: [number, number]; // indices into ORDERED_GRADE_VALUES
  // Filtros de sombra/sol (multi-selección); si está vacío/no definido, no filtra
  selectedShade?: (
    | 'shade_morning'
    | 'shade_afternoon'
    | 'shade_all_day'
    | 'sun_all_day'
  )[];
  // Flags opcionales para controlar visibilidad desde el caller
  showCategories?: boolean;
  showShade?: boolean;
  showGradeRange?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLink,
    TuiForm,
    TuiRange,
    TuiFilter,
    TranslatePipe,
  ],
  template: `
    <form tuiForm [formGroup]="form">
      <section>
        <tui-filter
          formControlName="filters"
          size="l"
          [items]="climbingKindItems()"
        />
      </section>

      <section class="tui-space_top-3">
        <tui-filter formControlName="shade" size="l" [items]="shadeItems()" />
      </section>

      <section>
        <div class="flex gap-2 justify-between">
          <span class="font-medium">{{ selectedMinLabel() }}</span>
          <span class="font-medium">{{ selectedMaxLabel() }}</span>
        </div>
        <tui-range
          id="grade-range"
          size="m"
          [min]="minIndex"
          [max]="maxIndex"
          [step]="1"
          [segments]="segments"
          [keySteps]="keySteps"
          formControlName="gradeRange"
        />
        <div class="flex gap-2 justify-between">
          @for (label of tickLabels; track label; let i = $index) {
            <a
              tuiLink
              appearance="action-grayscale"
              role="button"
              (click.zoneless)="onTickClick(keySteps[i][1])"
              >{{ label }}</a
            >
          }
        </div>
      </section>

      <footer class="flex gap-2 justify-end items-center">
        <button
          appearance="secondary"
          tuiButton
          type="button"
          (click.zoneless)="clear()"
        >
          {{ 'actions.clear' | translate }}
        </button>
        <button tuiButton type="submit">
          {{ 'actions.apply' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(submit.prevent)': 'submit()' },
})
export class FilterDialogComponent {
  private readonly translate = inject(TranslateService);
  protected readonly context =
    injectContext<TuiDialogContext<FilterDialog, FilterDialog>>();

  // i18n tick to recompute signals when language/translation changes
  private readonly _i18nTick: WritableSignal<number> = signal(0);

  // Items for TuiFilter (types) as signals
  readonly climbingKindItems: Signal<string[]> = computed(() => {
    // read to establish dependency
    this._i18nTick();
    return [
      this.translate.instant('filters.types.sport'),
      this.translate.instant('filters.types.boulder'),
      this.translate.instant('filters.types.multipitch'),
    ];
  });

  // Items for shade filter (no-op for now) as signal
  readonly shadeItems: Signal<string[]> = computed(() => {
    this._i18nTick();
    return [
      this.translate.instant('filters.shade.morning'),
      this.translate.instant('filters.shade.afternoon'),
      this.translate.instant('filters.shade.allDay'),
      this.translate.instant('filters.shade.noShade'),
    ];
  });

  // Reactive form for types (and shade placeholder)
  protected readonly form = new FormGroup({
    filters: new FormControl<string[]>([]),
    shade: new FormControl<string[]>([]),
    gradeRange: new FormControl<[number, number]>([
      0 as number,
      0 as number,
    ] as [number, number]),
  });

  // Bounds for indices
  protected readonly minIndex = 0;
  protected readonly maxIndex = ORDERED_GRADE_VALUES.length - 1;

  // Grades range state as signal (mirror of form control)
  protected readonly gradeRange: WritableSignal<[number, number]> = signal([
    this.minIndex,
    this.maxIndex,
  ]);

  // Key steps and tick labels for the range (more segments)
  protected readonly segments = 8; // increase visual segments for finer guidance
  protected readonly keySteps: TuiKeySteps = [
    [0, 0],
    ...Array.from({ length: this.segments - 1 }, (_, i) => {
      const percent = (100 / this.segments) * (i + 1);
      const idx = Math.round(
        (ORDERED_GRADE_VALUES.length - 1) * (percent / 100),
      );
      return [percent, idx] as [number, number];
    }),
    [100, ORDERED_GRADE_VALUES.length - 1],
  ];
  protected readonly tickLabels: string[] = this.keySteps.map(
    ([, idx]) => ORDERED_GRADE_VALUES[idx] ?? '',
  );

  constructor() {
    const d = this.context.data;
    if (d) {
      const itemsNow = this.climbingKindItems();
      const selectedFilters = d.categories
        .map((i) => itemsNow[i])
        .filter(Boolean);

      this.form.patchValue({
        filters: selectedFilters,
      });

      if (Array.isArray(d.selectedShade) && d.selectedShade.length) {
        const shadeNow = this.shadeItems();
        const indexByKey: Record<string, number> = {
          shade_morning: 0,
          shade_afternoon: 1,
          shade_all_day: 2,
          sun_all_day: 3,
        };
        const selectedLabels = d.selectedShade
          .map((k) => shadeNow[indexByKey[k] ?? -1])
          .filter(Boolean);
        this.form.patchValue({ shade: selectedLabels });
      }
      if (Array.isArray(d.gradeRange)) {
        const sanitized = this.sanitizeRange(d.gradeRange as [number, number]);
        this.form.patchValue({ gradeRange: sanitized });
        this.gradeRange.set(sanitized);
      }
    }

    this.translate.onLangChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );
    this.translate.onDefaultLangChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );
    this.translate.onTranslationChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );

    const grCtrl = this.form.get('gradeRange') as FormControl<
      [number, number] | null
    >;
    const initial = grCtrl.value ?? [this.minIndex, this.maxIndex];
    const sanitizedInitial = this.sanitizeRange(initial as [number, number]);
    if (
      !grCtrl.value ||
      grCtrl.value[0] !== sanitizedInitial[0] ||
      grCtrl.value[1] !== sanitizedInitial[1]
    ) {
      grCtrl.setValue(sanitizedInitial, { emitEvent: false });
    }
    this.gradeRange.set(sanitizedInitial);
    grCtrl.valueChanges.subscribe((val) => {
      const arr: [number, number] = Array.isArray(val)
        ? (val as [number, number])
        : ([this.minIndex, this.maxIndex] as [number, number]);
      this.gradeRange.set(this.sanitizeRange(arr));
    });
  }

  private clamp(v: number): number {
    return Math.max(this.minIndex, Math.min(this.maxIndex, Math.round(v)));
  }

  private sanitizeRange([a, b]: [number, number]): [number, number] {
    const lo = this.clamp(a);
    const hi = this.clamp(b);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }

  protected onTickClick(targetIdx: number): void {
    const grCtrl = this.form.get('gradeRange') as FormControl<
      [number, number] | null
    >;
    const current = (grCtrl.value ?? [this.minIndex, this.maxIndex]) as [
      number,
      number,
    ];
    const [lo, hi] = current;
    const t = this.clamp(targetIdx);
    // Move the nearest thumb to the clicked tick
    const moveMin = Math.abs(t - lo) <= Math.abs(t - hi);
    const next: [number, number] = moveMin ? [t, hi] : [lo, t];
    grCtrl.setValue(this.sanitizeRange(next));
  }

  protected readonly selectedMinLabel: Signal<string> = computed(() => {
    const [lo] = this.sanitizeRange(this.gradeRange());
    return ORDERED_GRADE_VALUES[lo] ?? '';
  });

  protected readonly selectedMaxLabel: Signal<string> = computed(() => {
    const [, hi] = this.sanitizeRange(this.gradeRange());
    return ORDERED_GRADE_VALUES[hi] ?? '';
  });

  protected submit(): void {
    const selected = this.form.value.filters ?? [];
    const categories: number[] = [];
    const itemsNow = this.climbingKindItems();
    if (selected.includes(itemsNow[0])) categories.push(0);
    if (selected.includes(itemsNow[1])) categories.push(1);
    if (selected.includes(itemsNow[2])) categories.push(2);

    const selectedShadeLabels = this.form.value.shade ?? [];
    const shadeNow = this.shadeItems();
    const selectedShade: NonNullable<FilterDialog['selectedShade']> =
      selectedShadeLabels
        .map((label) => shadeNow.findIndex((s) => s === label))
        .map((idx) =>
          idx === 0
            ? 'shade_morning'
            : idx === 1
              ? 'shade_afternoon'
              : idx === 2
                ? 'shade_all_day'
                : idx === 3
                  ? 'sun_all_day'
                  : undefined,
        )
        .filter((v): v is Exclude<typeof v, undefined> => !!v);

    const payload: FilterDialog = {
      categories: categories.length ? categories : [],
      gradeRange: this.sanitizeRange(
        (this.form.value.gradeRange as [number, number]) ?? [
          this.minIndex,
          this.maxIndex,
        ],
      ),
      selectedShade,
      showCategories: this.context.data?.showCategories,
      showShade: this.context.data?.showShade,
      showGradeRange: this.context.data?.showGradeRange,
    };
    this.context.completeWith(payload);
  }

  protected clear(): void {
    this.form.reset({
      gradeRange: [this.minIndex, this.maxIndex],
    });
    this.context.completeWith({
      categories: [],
      gradeRange: [this.minIndex, this.maxIndex],
      selectedShade: [],
      showCategories: this.context.data?.showCategories,
      showShade: this.context.data?.showShade,
      showGradeRange: this.context.data?.showGradeRange,
    });
  }
}
