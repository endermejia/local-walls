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
  categories: number[]; // 0=Sport, 1=Boulder
  gradeRange: [number, number]; // indices into ORDERED_GRADE_VALUES
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
        <tui-filter formControlName="filters" size="l" [items]="items()" />
      </section>

      <!-- Nueva sección de filtro (sin funcionalidad por ahora): Sombra -->
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
          (click.zoneless)="context.$implicit.complete()"
        >
          {{ 'actions.cancel' | translate }}
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
export class HomeFilterDialogComponent {
  private readonly translate = inject(TranslateService);
  protected readonly context =
    injectContext<TuiDialogContext<FilterDialog, FilterDialog>>();

  // i18n tick to recompute signals when language/translation changes
  private readonly _i18nTick: WritableSignal<number> = signal(0);

  // Items for TuiFilter (types) as signals
  readonly items: Signal<string[]> = computed(() => {
    // read to establish dependency
    this._i18nTick();
    return [
      this.translate.instant('filters.types.sport'),
      this.translate.instant('filters.types.boulder'),
    ];
  });

  // Items for shade filter (no-op for now) as signal
  readonly shadeItems: Signal<string[]> = computed(() => {
    this._i18nTick();
    return [
      this.translate.instant('filters.shade.morning'),
      this.translate.instant('filters.shade.afternoon'),
      this.translate.instant('filters.shade.allDay'),
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

  private _prevShade: string[] = [];

  constructor() {
    // Initialize from incoming dialog data if provided
    const d = this.context.data;
    if (d) {
      const both = d.categories.includes(0) && d.categories.includes(1);
      const onlySport = d.categories.includes(0) && !d.categories.includes(1);
      const onlyBoulder = d.categories.includes(1) && !d.categories.includes(0);
      const itemsNow = this.items();
      this.form.patchValue({
        filters: both
          ? itemsNow.slice()
          : onlySport
            ? [itemsNow[0]]
            : onlyBoulder
              ? [itemsNow[1]]
              : [],
      });
      if (Array.isArray(d.gradeRange)) {
        const sanitized = this.sanitizeRange(d.gradeRange as [number, number]);
        this.form.patchValue({ gradeRange: sanitized });
        this.gradeRange.set(sanitized);
      }
    }

    // Recompute labels when language changes
    this.translate.onLangChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );
    this.translate.onDefaultLangChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );
    this.translate.onTranslationChange.subscribe(() =>
      this._i18nTick.update((v) => v + 1),
    );

    // Make shade filter mutually exclusive (single selection)
    const shadeCtrl = this.form.get('shade') as FormControl<string[]>;
    this._prevShade = Array.isArray(shadeCtrl.value) ? shadeCtrl.value : [];
    shadeCtrl.valueChanges.subscribe((val) => {
      const arr = Array.isArray(val) ? val : [];
      if (arr.length <= 1) {
        this._prevShade = arr;
        return;
      }
      // Keep only the last added item; allow clearing to empty via UI
      const prev = this._prevShade || [];
      const added = arr.find((x) => !prev.includes(x)) ?? arr[arr.length - 1];
      const next = added ? [added] : [];
      this._prevShade = next;
      // Avoid feedback loop
      shadeCtrl.patchValue(next, { emitEvent: false });
    });

    // Initialize and sync gradeRange signal with form control
    const grCtrl = this.form.get('gradeRange') as FormControl<
      [number, number] | null
    >;
    // Set default if empty
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
    const itemsNow = this.items();
    if (selected.includes(itemsNow[0])) categories.push(0);
    if (selected.includes(itemsNow[1])) categories.push(1);

    const payload: FilterDialog = {
      categories: categories.length ? categories : [],
      gradeRange: this.sanitizeRange(
        (this.form.value.gradeRange as [number, number]) ?? [
          this.minIndex,
          this.maxIndex,
        ],
      ),
    };
    this.context.completeWith(payload);
  }
}
