import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiLink, TuiKeySteps, TuiCheckbox } from '@taiga-ui/core';
import { TuiFilter, TuiRange } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { type TuiDialogContext } from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { map, merge, startWith } from 'rxjs';

import { ORDERED_GRADE_VALUES } from '../../models';

import { clamp } from '../../utils';

export interface FilterDialog {
  categories: number[]; // 0=Sport, 1=Boulder, 2=Multipitch
  gradeRange: [number, number]; // indices into ORDERED_GRADE_VALUES
  // Shade/sun filters (multi-selection); if empty/undefined, it doesn't filter
  selectedShade?: (
    | 'shade_morning'
    | 'shade_afternoon'
    | 'shade_all_day'
    | 'sun_all_day'
  )[];
  indoor?: boolean;
  outdoor?: boolean;
  // Optional flags to control visibility from the caller
  showCategories?: boolean;
  showShade?: boolean;
  showGradeRange?: boolean;
  showIndoorOutdoor?: boolean;
  showIndoorAscents?: boolean;
}

@Component({
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiFilter,
    TuiForm,
    TuiCheckbox,
    TuiLink,
    TuiRange,
  ],
  template: `
    <form tuiForm [formGroup]="form">
      @if (showIndoorOutdoor) {
        <section>
          <tui-filter
            formControlName="indoorOutdoor"
            size="l"
            [items]="indoorOutdoorItems()"
          />
        </section>
      }

      @if (showCategories) {
        <section class="tui-space_top-3">
          <tui-filter
            formControlName="filters"
            size="l"
            [items]="climbingKindItems()"
          />
        </section>
      }

      @if (showShade) {
        <section class="tui-space_top-3">
          <tui-filter formControlName="shade" size="l" [items]="shadeItems()" />
        </section>
      }

      @if (showGradeRange) {
        <section>
          <div class="flex flex-wrap gap-2 justify-between">
            <span class="font-medium">{{ selectedMinLabel() }}</span>
            <span class="font-medium">{{ selectedMaxLabel() }}</span>
          </div>
          <tui-range
            id="grade-range"
            [style.--tui-thumb-size.rem]="0.75"
            [min]="minIndex"
            [max]="maxIndex"
            [step]="1"
            [segments]="segments"
            [keySteps]="keySteps"
            formControlName="gradeRange"
          />
          <div class="flex items-center gap-2 mt-4">
            <input
              tuiCheckbox
              type="checkbox"
              formControlName="showIndoorAscents"
              id="showIndoorAscents"
            />
            <label for="showIndoorAscents">{{
              'indoor.showIndoorAscents' | translate
            }}</label>
          </div>

          <div class="hidden sm:flex flex-wrap gap-2 justify-between">
            @for (label of tickLabels; track label; let i = $index) {
              <a
                tuiLink
                appearance="action-grayscale"
                role="button"
                tabindex="0"
                (click.zoneless)="onTickClick(keySteps[i][1])"
                (keydown.enter)="onTickClick(keySteps[i][1])"
                >{{ label }}</a
              >
            }
          </div>
        </section>
      }

      <footer class="flex flex-wrap gap-2 justify-end items-center">
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
  host: { '(submit.prevent)': 'submit()' },
})
export class FilterDialogComponent {
  private readonly translate = inject(TranslateService);
  protected readonly context =
    injectContext<TuiDialogContext<FilterDialog, FilterDialog>>();

  // i18n tick to recompute signals when language/translation changes
  private readonly _i18nTick: WritableSignal<number> = signal(0);

  protected get showCategories(): boolean {
    return this.context.data?.showCategories ?? true;
  }

  protected get showShade(): boolean {
    return this.context.data?.showShade ?? true;
  }

  protected get showGradeRange(): boolean {
    return this.context.data?.showGradeRange ?? true;
  }

  protected get showIndoorOutdoor(): boolean {
    return this.context.data?.showIndoorOutdoor ?? false;
  }

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

  // Items for shade filter (no-op for now) as a signal
  readonly shadeItems: Signal<string[]> = computed(() => {
    this._i18nTick();
    return [
      this.translate.instant('filters.shade.morning'),
      this.translate.instant('filters.shade.afternoon'),
      this.translate.instant('filters.shade.allDay'),
      this.translate.instant('filters.shade.noShade'),
    ];
  });

  readonly indoorOutdoorItems: Signal<string[]> = computed(() => {
    this._i18nTick();
    return [
      this.translate.instant('indoor.button'),
      this.translate.instant('outdoor.button'),
    ];
  });

  // Reactive form for types (and shade placeholder)
  protected readonly form = new FormGroup({
    filters: new FormControl<string[]>([]),
    shade: new FormControl<string[]>([]),
    indoorOutdoor: new FormControl<string[]>([]),
    gradeRange: new FormControl<[number, number]>([0, 0], {
      nonNullable: true,
    }),
    showIndoorAscents: new FormControl<boolean>(false, { nonNullable: true }),
  });

  // Bounds for indices
  protected readonly minIndex = 0;
  protected readonly maxIndex = ORDERED_GRADE_VALUES.length - 2; // exclude last item ('?') from range filter

  // Grades range state as signal (mirror of form control)
  protected readonly gradeRange: Signal<[number, number]>;

  // Key steps and tick labels for the range (more segments)
  protected readonly segments = 8; // increase visual segments for finer guidance
  protected readonly keySteps: TuiKeySteps = [
    [0, 0],
    ...Array.from({ length: this.segments - 1 }, (_, i) => {
      const percent = (100 / this.segments) * (i + 1);
      const idx = Math.round(this.maxIndex * (percent / 100));
      return [percent, idx] satisfies [number, number];
    }),
    [100, this.maxIndex],
  ];
  protected readonly tickLabels: string[] = this.keySteps.map(
    ([, idx]) => ORDERED_GRADE_VALUES[idx] ?? '',
  );

  // React to i18n changes
  private readonly langUpdateTrigger = toSignal(
    merge(
      this.translate.onLangChange,
      this.translate.onDefaultLangChange,
      this.translate.onTranslationChange,
    ),
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
      if (Array.isArray(d.gradeRange) && d.gradeRange.length === 2) {
        const sanitized = this.sanitizeRange(d.gradeRange as [number, number]);
        this.form.patchValue({ gradeRange: sanitized });
      }
      if (d.showIndoorAscents !== undefined) {
        this.form.patchValue({ showIndoorAscents: d.showIndoorAscents });
      }

      if (d.showIndoorOutdoor) {
        const ioNow = this.indoorOutdoorItems();
        const selectedIO: string[] = [];
        if (d.indoor !== false) selectedIO.push(ioNow[0]);
        if (d.outdoor !== false) selectedIO.push(ioNow[1]);
        this.form.patchValue({ indoorOutdoor: selectedIO });
      }
    }

    // React to i18n changes
    effect(() => {
      this.langUpdateTrigger();
      this._i18nTick.update((v) => v + 1);
    });

    const grCtrl = this.form.controls.gradeRange;
    const initial = grCtrl.value;
    const sanitizedInitial = this.sanitizeRange(initial);
    if (
      grCtrl.value[0] !== sanitizedInitial[0] ||
      grCtrl.value[1] !== sanitizedInitial[1]
    ) {
      grCtrl.setValue(sanitizedInitial, { emitEvent: false });
    }

    // React to grade range changes
    this.gradeRange = toSignal(
      grCtrl.valueChanges.pipe(
        startWith(grCtrl.value),
        map((v) => this.sanitizeRange(v ?? [this.minIndex, this.maxIndex])),
      ),
      { initialValue: sanitizedInitial },
    ) as Signal<[number, number]>;
  }

  private sanitizeRange([a, b]: [number, number]): [number, number] {
    const lo = clamp(Math.round(a), this.minIndex, this.maxIndex);
    const hi = clamp(Math.round(b), this.minIndex, this.maxIndex);
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
    const t = clamp(targetIdx, this.minIndex, this.maxIndex);
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

    const selectedIO = this.form.value.indoorOutdoor ?? [];
    const ioNow = this.indoorOutdoorItems();
    const indoor = selectedIO.includes(ioNow[0]);
    const outdoor = selectedIO.includes(ioNow[1]);

    const rawGradeRange = this.sanitizeRange(
      (this.form.value.gradeRange as [number, number]) ?? [
        this.minIndex,
        this.maxIndex,
      ],
    );

    const payload: FilterDialog = {
      categories: categories.length ? categories : [],
      gradeRange: [
        rawGradeRange[0],
        rawGradeRange[1] >= this.maxIndex
          ? ORDERED_GRADE_VALUES.length - 1
          : rawGradeRange[1],
      ],
      selectedShade,
      indoor,
      outdoor,
      showCategories: this.context.data?.showCategories,
      showShade: this.context.data?.showShade,
      showGradeRange: this.context.data?.showGradeRange,
      showIndoorOutdoor: this.context.data?.showIndoorOutdoor,
      showIndoorAscents: this.form.value.showIndoorAscents,
    };
    this.context.completeWith(payload);
  }

  protected clear(): void {
    const ioNow = this.indoorOutdoorItems();
    this.form.reset({
      gradeRange: [this.minIndex, this.maxIndex],
      indoorOutdoor: [ioNow[0], ioNow[1]],
      showIndoorAscents: false,
    });
    this.context.completeWith({
      categories: [],
      gradeRange: [this.minIndex, ORDERED_GRADE_VALUES.length - 1],
      selectedShade: [],
      indoor: true,
      outdoor: true,
      showCategories: this.context.data?.showCategories,
      showShade: this.context.data?.showShade,
      showGradeRange: this.context.data?.showGradeRange,
      showIndoorOutdoor: this.context.data?.showIndoorOutdoor,
      showIndoorAscents: false,
    });
  }
}
