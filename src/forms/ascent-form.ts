import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TuiDay } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  tuiDateFormatProvider,
  TuiDialogService,
  TuiHint,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiCheckbox,
  TuiChevron,
  TuiDataListWrapper,
  TuiInputDate,
  TuiRating,
  TuiSelect,
  TuiTextarea,
  TuiFiles,
  TuiInputFiles,
  TuiFileRejectedPipe,
} from '@taiga-ui/kit';
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, startWith } from 'rxjs';

import {
  AscentDialogData,
  AscentType,
  AscentTypes,
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import {
  AscentsService,
  GlobalData,
  RoutesService,
  SupabaseService,
  ToastService,
} from '../services';

import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';
import { CounterComponent } from '../components/counter';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-ascent-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiTextfield,
    TuiIcon,
    TuiRating,
    TuiDataListWrapper,
    TuiInputDate,
    TuiCheckbox,
    TuiSelect,
    TuiChevron,
    TuiHint,
    TuiLabel,
    TuiTextarea,
    TuiAppearance,
    CounterComponent,
    TuiFiles,
    TuiInputFiles,
    TuiFileRejectedPipe,
  ],
  providers: [tuiDateFormatProvider({ mode: 'DMY', separator: '/' })],
  template: `
    <form
      [formGroup]="form"
      class="flex flex-col h-full"
      (submit.zoneless)="onSubmit($event)"
    >
      <div class="flex-1 flex flex-col gap-6">
        <!-- WHEN DID YOU CLIMB IT? -->
        <section class="grid gap-3">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.when' | translate
          }}</span>
          <tui-textfield [tuiTextfieldCleaner]="false">
            <input tuiInputDate [max]="today" formControlName="date" />
            <tui-calendar *tuiTextfieldDropdown />
          </tui-textfield>
          <div class="flex flex-wrap gap-2">
            <button
              tuiButton
              appearance="secondary"
              size="s"
              type="button"
              (click)="quickDate('yesterday')"
            >
              {{ 'ascent.yesterday' | translate }}
            </button>
            <button
              tuiButton
              appearance="secondary"
              size="s"
              type="button"
              (click)="quickDate('lastSaturday')"
            >
              {{ 'ascent.lastSaturday' | translate }}
            </button>
            <button
              tuiButton
              appearance="secondary"
              size="s"
              type="button"
              (click)="quickDate('lastSunday')"
            >
              {{ 'ascent.lastSunday' | translate }}
            </button>
          </div>
        </section>

        <!-- HOW DID YOU CLIMB IT? -->
        <section class="grid gap-4">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.how' | translate
          }}</span>
          <div class="flex flex-wrap gap-2 items-center justify-around">
            @for (opt of typeOptions; track opt.id) {
              <div class="flex flex-col items-center gap-2">
                <button
                  tuiIconButton
                  type="button"
                  size="l"
                  class="transition-transform active:scale-95 !rounded-full"
                  [style.background]="
                    form.get('type')?.value === opt.id ? opt.background : ''
                  "
                  [class.!text-white]="form.get('type')?.value === opt.id"
                  [appearance]="
                    form.get('type')?.value === opt.id ? 'none' : 'neutral'
                  "
                  (click)="form.get('type')?.setValue(opt.id)"
                >
                  <tui-icon [icon]="opt.icon" />
                </button>
                <button
                  type="button"
                  class="text-xs font-medium appearance-none bg-transparent border-none p-0"
                  (click)="form.get('type')?.setValue(opt.id)"
                >
                  {{ opt.translate | translate }}
                </button>
              </div>
            }
          </div>

          <app-counter
            formControlName="attempts"
            label="ascent.tries"
            [min]="form.get('type')?.value === 'rp' ? 2 : 1"
          />
        </section>

        <!-- SHARE YOUR THOUGHTS -->
        <section class="grid gap-3">
          <tui-textfield
            [tuiTextfieldCleaner]="false"
            class="max-w-full overflow-hidden"
          >
            <label tuiLabel for="ascentComment">{{
              'ascent.thoughts' | translate
            }}</label>
            <textarea
              id="ascentComment"
              tuiTextarea
              formControlName="comment"
              [placeholder]="'ascent.thoughtsPlaceholder' | translate"
              rows="5"
            ></textarea>
          </tui-textfield>
          <label class="flex items-center gap-2 cursor-pointer self-start">
            <input
              tuiCheckbox
              type="checkbox"
              formControlName="private_comment"
            />
            <span class="text-sm">{{ 'ascent.private' | translate }}</span>
          </label>
        </section>

        <section class="grid gap-3">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs font-bold opacity-60 uppercase">{{
              'ascent.photo' | translate
            }}</span>
            <div class="flex items-center gap-2">
              @if (photoValue() || existingPhotoUrl()) {
                <button
                  tuiButton
                  type="button"
                  appearance="secondary"
                  size="s"
                  iconStart="@tui.pencil"
                  (click)="
                    editPhoto(photoValue() || null, existingPhotoUrl() || undefined)
                  "
                >
                  {{ 'actions.edit' | translate }}
                </button>
              }

              @if (existingPhotoUrl()) {
                <button
                  tuiButton
                  type="button"
                  appearance="negative"
                  size="s"
                  iconStart="@tui.trash"
                  (click)="onDeleteExistingPhoto()"
                >
                  {{ 'ascent.deletePhoto' | translate }}
                </button>
              }
            </div>
          </div>

          <div class="grid gap-2">
            @if (!photoValue() && !existingPhotoUrl()) {
              <label tuiInputFiles>
                <input
                  accept="image/*"
                  tuiInputFiles
                  [formControl]="photoControl"
                />
              </label>
            }

            <tui-files class="mt-2">
              @if (
                photoValue() | tuiFileRejected: { accept: 'image/*' } | async;
                as file
              ) {
                <tui-file
                  state="error"
                  [file]="file"
                  (remove)="removePhotoFile()"
                />
              }

              @if (photoValue(); as file) {
                <div class="relative group">
                  <tui-file [file]="file" (remove)="removePhotoFile()" />
                  @if (previewUrl()) {
                    <div class="mt-2 rounded-xl overflow-hidden relative group">
                      <img
                        [src]="previewUrl()"
                        class="w-full h-auto max-h-48 object-cover"
                        alt="Preview"
                      />
                    </div>
                  }
                </div>
              }

              @if (existingPhotoUrl(); as photoUrl) {
                @if (!photoValue()) {
                  <div class="rounded-xl overflow-hidden relative group">
                    <img
                      [src]="photoUrl"
                      class="w-full h-auto max-h-48 object-cover"
                      alt="Existing photo"
                    />
                  </div>
                }
              }
            </tui-files>
          </div>
        </section>

        <!-- DID YOU LIKE IT? -->
        <section class="grid gap-3">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.didYouLikeIt' | translate
          }}</span>
          <div class="flex flex-wrap items-center gap-4">
            <tui-rating [max]="5" formControlName="rate" class="text-primary" />
            <button
              tuiIconButton
              type="button"
              [appearance]="
                form.get('recommended')?.value ? 'primary' : 'secondary'
              "
              size="m"
              (click)="toggleBool('recommended')"
              [tuiHint]="
                global.isMobile() ? null : ('ascent.recommend' | translate)
              "
            >
              <tui-icon
                [icon]="
                  form.get('recommended')?.value
                    ? '@tui.thumbs-up'
                    : '@tui.thumbs-up'
                "
              />
            </button>
          </div>
        </section>

        <!-- GRADE SELECTOR -->
        <section class="grid gap-3">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.howWouldYouGrade' | translate
          }}</span>
          <div
            class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <button
              tuiButton
              type="button"
              size="m"
              [appearance]="form.get('soft')?.value ? 'primary' : 'neutral'"
              (click)="toggleBool('soft')"
              class="!rounded-xl grow sm:grow-0"
            >
              {{ 'ascent.soft' | translate }}
            </button>

            <div class="flex items-center gap-2 grow min-w-0">
              <button
                tuiIconButton
                type="button"
                size="m"
                appearance="secondary"
                iconStart="@tui.minus"
                class="!rounded-full shrink-0"
                (click)="changeGrade(-1)"
              >
                -
              </button>

              <tui-textfield
                tuiChevron
                [tuiTextfieldCleaner]="false"
                [stringify]="gradeStringify"
                tuiTextfieldSize="m"
                class="grow min-w-0"
              >
                <label tuiLabel for="ascentGrade">{{
                  'labels.grade' | translate
                }}</label>
                <input tuiSelect id="ascentGrade" formControlName="grade" />
                <tui-data-list-wrapper
                  *tuiTextfieldDropdown
                  new
                  [items]="gradeOptions"
                ></tui-data-list-wrapper>
              </tui-textfield>

              <button
                tuiIconButton
                type="button"
                size="m"
                appearance="secondary"
                iconStart="@tui.plus"
                class="!rounded-full shrink-0"
                (click)="changeGrade(1)"
              >
                +
              </button>
            </div>

            <button
              tuiButton
              type="button"
              size="m"
              [appearance]="form.get('hard')?.value ? 'primary' : 'neutral'"
              (click)="toggleBool('hard')"
              class="!rounded-xl grow sm:grow-0"
            >
              {{ 'ascent.hard' | translate }}
            </button>
          </div>
        </section>

        @if (showMore()) {
          <section tuiAppearance="neutral" class="grid gap-6 p-4 rounded-xl">
            <h3 class="text-sm font-bold opacity-50 uppercase tracking-wider">
              {{ 'ascent.moreInfo' | translate }}
            </h3>

            <!-- TYPE OF CLIMBING -->
            <div class="grid gap-3">
              <span class="text-xs font-bold opacity-60 uppercase">{{
                'ascent.typeOfClimbing' | translate
              }}</span>
              <div class="flex flex-wrap gap-2">
                @for (key of climbingTypes; track key) {
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    [appearance]="form.get(key)?.value ? 'primary' : 'neutral'"
                    (click)="toggleBool(key)"
                  >
                    {{ 'ascent.climbing.' + key | translate }}
                  </button>
                }
              </div>
            </div>

            <!-- STEEPNESS -->
            <div class="grid gap-3">
              <span class="text-xs font-bold opacity-60 uppercase">{{
                'ascent.steepness.title' | translate
              }}</span>
              <div class="flex flex-wrap gap-2">
                @for (key of steepnessTypes; track key) {
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    [appearance]="form.get(key)?.value ? 'primary' : 'neutral'"
                    (click)="toggleBool(key)"
                  >
                    {{ 'ascent.steepness.' + key | translate }}
                  </button>
                }
              </div>
            </div>

            <!-- SAFETY -->
            <div class="grid gap-3">
              <span class="text-xs font-bold opacity-60 uppercase">{{
                'ascent.safety.title' | translate
              }}</span>
              <div class="flex flex-wrap gap-2">
                @for (key of safetyIssues; track key) {
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    [appearance]="form.get(key)?.value ? 'primary' : 'neutral'"
                    (click)="toggleBool(key)"
                  >
                    {{ 'ascent.safety.' + key | translate }}
                  </button>
                }
              </div>
            </div>

            <!-- OTHER -->
            <div class="grid gap-3">
              <span class="text-xs font-bold opacity-60 uppercase">{{
                'ascent.other.title' | translate
              }}</span>
              <div class="flex flex-wrap gap-2">
                @for (key of otherInfo; track key) {
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    [appearance]="form.get(key)?.value ? 'primary' : 'neutral'"
                    (click)="toggleBool(key)"
                  >
                    {{ 'ascent.other.' + key | translate }}
                  </button>
                }
              </div>
            </div>
          </section>
        } @else {
          <button
            tuiButton
            appearance="flat"
            size="s"
            type="button"
            (click)="showMore.set(true)"
          >
            {{ 'labels.userInfo' | translate }} +
          </button>
        }
      </div>

      <!-- FOOTER ACTIONS -->
      <div class="flex gap-2 justify-end flex-wrap pt-4">
        @if (isEdit()) {
          <button
            tuiButton
            appearance="negative"
            type="button"
            (click.zoneless)="onDelete()"
          >
            {{ 'actions.delete' | translate }}
          </button>
        }
        <div class="grow"></div>
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="cancel()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          [disabled]="form.invalid"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'actions.save' : 'actions.create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export default class AscentFormComponent {
  protected readonly global = inject(GlobalData);
  private readonly ascents = inject(AscentsService);
  private readonly supabase = inject(SupabaseService);
  private readonly routesService = inject(RoutesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  private readonly _dialogCtx: TuiDialogContext<
    boolean,
    AscentDialogData
  > | null = (() => {
    try {
      return injectContext<TuiDialogContext<boolean, AscentDialogData>>();
    } catch {
      return null;
    }
  })();

  routeId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  ascentData: InputSignal<RouteAscentWithExtras | undefined> = input<
    RouteAscentWithExtras | undefined
  >(undefined);

  private readonly dialogRouteId = this._dialogCtx?.data?.routeId;
  private readonly dialogRouteName = this._dialogCtx?.data?.routeName;
  private readonly dialogAscentData = this._dialogCtx?.data?.ascentData;
  private readonly dialogGrade = this._dialogCtx?.data?.grade;

  private readonly routeName = computed(() => {
    const data = this.effectiveAscentData();
    return this.dialogRouteName || data?.route?.name || '?';
  });

  private readonly effectiveRouteId = computed(
    () => this.dialogRouteId ?? this.routeId(),
  );
  private readonly effectiveAscentData = computed(
    () => this.dialogAscentData ?? this.ascentData(),
  );

  readonly isEdit = computed(() => !!this.effectiveAscentData());
  readonly showMore = signal(false);

  protected readonly photoControl = new FormControl<File | null>(null);
  protected readonly photoValue = toSignal(
    this.photoControl.valueChanges.pipe(startWith(this.photoControl.value)),
    { initialValue: null },
  );
  protected readonly previewUrl = signal<string | null>(null);

  protected readonly isExistingPhotoDeleted = signal(false);

  protected readonly existingPhotoResource = resource({
    params: () => {
      const data = this.effectiveAscentData();
      return data?.photo_path || null;
    },
    loader: async ({ params: path }) => {
      if (!path) return null;
      return this.supabase.getAscentSignedUrl(path);
    },
  });
  protected readonly existingPhotoUrl = computed(() =>
    this.isExistingPhotoDeleted() ? null : this.existingPhotoResource.value(),
  );

  readonly today = TuiDay.currentLocal();

  readonly form = new FormGroup({
    type: new FormControl<string>(AscentTypes.RP, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    rate: new FormControl<number>(0, { nonNullable: true }),
    comment: new FormControl<string>(''),
    date: new FormControl<TuiDay>(TuiDay.currentLocal(), { nonNullable: true }),
    attempts: new FormControl<number | null>(null),
    private_comment: new FormControl<boolean>(false, { nonNullable: true }),
    recommended: new FormControl<boolean>(false, { nonNullable: true }),
    soft: new FormControl<boolean>(false, { nonNullable: true }),
    hard: new FormControl<boolean>(false, { nonNullable: true }),
    grade: new FormControl<number | null>(null),
    // Technical details
    cruxy: new FormControl<boolean>(false, { nonNullable: true }),
    athletic: new FormControl<boolean>(false, { nonNullable: true }),
    sloper: new FormControl<boolean>(false, { nonNullable: true }),
    endurance: new FormControl<boolean>(false, { nonNullable: true }),
    technical: new FormControl<boolean>(false, { nonNullable: true }),
    crimpy: new FormControl<boolean>(false, { nonNullable: true }),
    // Steepness
    slab: new FormControl<boolean>(false, { nonNullable: true }),
    vertical: new FormControl<boolean>(false, { nonNullable: true }),
    overhang: new FormControl<boolean>(false, { nonNullable: true }),
    roof: new FormControl<boolean>(false, { nonNullable: true }),
    // Safety
    bad_anchor: new FormControl<boolean>(false, { nonNullable: true }),
    bad_bolts: new FormControl<boolean>(false, { nonNullable: true }),
    high_first_bolt: new FormControl<boolean>(false, { nonNullable: true }),
    lose_rock: new FormControl<boolean>(false, { nonNullable: true }),
    bad_clipping_position: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    // Other
    chipped: new FormControl<boolean>(false, { nonNullable: true }),
    with_kneepad: new FormControl<boolean>(false, { nonNullable: true }),
    no_score: new FormControl<boolean>(false, { nonNullable: true }),
    first_ascent: new FormControl<boolean>(false, { nonNullable: true }),
    traditional: new FormControl<boolean>(false, { nonNullable: true }),
  });

  protected readonly typeOptions = [
    {
      id: AscentTypes.OS,
      translate: 'ascentTypes.os',
      icon: '@tui.eye',
      background: 'var(--tui-status-positive)',
    },
    {
      id: AscentTypes.F,
      translate: 'ascentTypes.f',
      icon: '@tui.zap',
      background: 'var(--tui-status-warning)',
    },
    {
      id: AscentTypes.RP,
      translate: 'ascentTypes.rp',
      icon: '@tui.circle',
      background: 'var(--tui-status-negative)',
    },
  ];

  protected readonly climbingTypes = [
    'cruxy',
    'athletic',
    'sloper',
    'endurance',
    'technical',
    'crimpy',
  ];
  protected readonly steepnessTypes = ['slab', 'vertical', 'overhang', 'roof'];
  protected readonly safetyIssues = [
    'bad_anchor',
    'bad_bolts',
    'high_first_bolt',
    'lose_rock',
    'bad_clipping_position',
  ];
  protected readonly otherInfo = [
    'chipped',
    'with_kneepad',
    'no_score',
    'first_ascent',
    'traditional',
  ];

  protected readonly gradeItems = Object.entries(VERTICAL_LIFE_TO_LABEL)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => ({ id: Number(k), label: v }));

  protected readonly gradeStringify = (grade: number): string =>
    VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || '';

  protected changeGrade(delta: number): void {
    const ctrl = this.form.get('grade');
    if (!ctrl) return;
    const current = ctrl.value;
    if (current === null) {
      if (this.gradeItems.length > 0) {
        ctrl.setValue(this.gradeItems[0].id);
      }
      return;
    }

    const currentIndex = this.gradeItems.findIndex((i) => i.id === current);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < this.gradeItems.length) {
      ctrl.setValue(this.gradeItems[nextIndex].id);
    }
  }

  protected readonly gradeOptions = this.gradeItems.map((i) => i.id);

  constructor() {
    effect(
      () => {
        const file = this.photoValue();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            this.previewUrl.set(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          this.previewUrl.set(null);
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      const data = this.effectiveAscentData();
      if (!data) return;
      this.populateForm(data);
    });

    // Handle tries auto-disable for OS/Flash
    const typeValue = toSignal(
      this.form
        .get('type')!
        .valueChanges.pipe(startWith(this.form.get('type')!.value)),
    );

    effect(() => {
      this.updateTriesState(typeValue());
    });

    // Handle recommended -> rating
    const recommended = toSignal(
      this.form
        .get('recommended')!
        .valueChanges.pipe(startWith(this.form.get('recommended')!.value)),
    );

    effect(() => {
      if (recommended()) {
        this.form.get('rate')?.setValue(5);
      }
    });

    // Default grade if provided and not editing
    if (!this.effectiveAscentData() && this.dialogGrade !== undefined) {
      this.form.patchValue({ grade: this.dialogGrade });
    }
  }

  private updateTriesState(type: string | null | undefined): void {
    const attemptsCtrl = this.form.get('attempts');
    if (!attemptsCtrl) return;

    if (type === AscentTypes.OS || type === AscentTypes.F) {
      attemptsCtrl.setValue(1, { emitEvent: false });
      attemptsCtrl.disable({ emitEvent: false });
      attemptsCtrl.setValidators([Validators.required, Validators.min(1)]);
    } else if (type === AscentTypes.RP) {
      if (attemptsCtrl.value === 1) {
        attemptsCtrl.setValue(null, { emitEvent: false });
      }
      attemptsCtrl.enable({ emitEvent: false });
      attemptsCtrl.setValidators([Validators.min(2)]);
    } else {
      attemptsCtrl.enable({ emitEvent: false });
      attemptsCtrl.setValidators([Validators.required, Validators.min(1)]);
    }
    attemptsCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private populateForm(data: RouteAscentDto): void {
    this.form.patchValue({
      type: data.type ?? AscentTypes.RP,
      rate: data.rate ?? 0,
      comment: data.comment ?? '',
      attempts: data.attempts ?? null,
      private_comment: !!data.private_comment,
      recommended: !!data.recommended,
      soft: !!data.soft,
      hard: !!data.hard,
      cruxy: !!data.cruxy,
      athletic: !!data.athletic,
      sloper: !!data.sloper,
      endurance: !!data.endurance,
      technical: !!data.technical,
      crimpy: !!data.crimpy,
      slab: !!data.slab,
      vertical: !!data.vertical,
      overhang: !!data.overhang,
      roof: !!data.roof,
      bad_anchor: !!data.bad_anchor,
      bad_bolts: !!data.bad_bolts,
      high_first_bolt: !!data.high_first_bolt,
      lose_rock: !!data.lose_rock,
      bad_clipping_position: !!data.bad_clipping_position,
      chipped: !!data.chipped,
      with_kneepad: !!data.with_kneepad,
      no_score: !!data.no_score,
      first_ascent: !!data.first_ascent,
      traditional: !!data.traditional,
      grade: data.grade ?? null,
    });
    if (data.date) {
      const d = new Date(data.date);
      this.form.patchValue({
        date: new TuiDay(d.getFullYear(), d.getMonth(), d.getDate()),
      });
    }
  }

  protected toggleBool(key: string): void {
    const ctrl = this.form.get(key);
    if (!ctrl) return;
    const newVal = !ctrl.value;
    ctrl.setValue(newVal);

    // If setting soft to true, set hard to false
    if (key === 'soft' && newVal) {
      this.form.get('hard')?.setValue(false);
    }
    // If setting hard to true, set soft to false
    if (key === 'hard' && newVal) {
      this.form.get('soft')?.setValue(false);
    }
  }

  protected quickDate(mode: 'yesterday' | 'lastSaturday' | 'lastSunday'): void {
    const d = new Date();
    if (mode === 'yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (mode === 'lastSaturday') {
      const day = d.getDay();
      const diff = day === 6 ? 0 : (day + 1) % 7;
      d.setDate(d.getDate() - diff);
    } else if (mode === 'lastSunday') {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
    }
    this.form.patchValue({
      date: new TuiDay(d.getFullYear(), d.getMonth(), d.getDate()),
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.form.invalid) return;

    const route_id = this.effectiveRouteId();
    const ascentData = this.effectiveAscentData();
    const user_id = ascentData
      ? ascentData.user_id
      : this.supabase.authUser()?.id;
    if (!user_id) return;

    const values = this.form.getRawValue();
    const payload: Omit<RouteAscentInsertDto, 'user_id' | 'route_id'> = {
      ...values,
      date: `${values.date.year}-${String(values.date.month + 1).padStart(2, '0')}-${String(values.date.day).padStart(2, '0')}`,
      type: values.type as AscentType,
      rate: values.rate === 0 ? null : values.rate,
    };

    try {
      let savedAscent: RouteAscentDto | null = null;
      if (ascentData) {
        savedAscent = await this.ascents.update(ascentData.id, payload);
      } else if (route_id && user_id) {
        savedAscent = await this.ascents.create({
          ...payload,
          route_id,
          user_id,
        });
        await this.routesService.removeRouteProject(route_id);
      }

      // Handle photo upload if a new file was selected
      const photoFile = this.photoControl.value;
      if (savedAscent && photoFile) {
        await this.ascents.uploadPhoto(savedAscent.id, photoFile);
      }
    } catch (e) {
      const error = e as Error;
      handleErrorToast(error, this.toast);
    } finally {
      this._dialogCtx?.completeWith(true);
    }
  }

  protected removePhotoFile(): void {
    this.photoControl.setValue(null);
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
      aspectRatios: [
        { titleKey: 'square', descriptionKey: '1:1', ratio: 1 },
        { titleKey: 'portrait', descriptionKey: '4:5', ratio: 4 / 5 },
        { titleKey: 'landscape', descriptionKey: '16:9', ratio: 16 / 9 },
      ],
    };

    if (!data.file && !data.imageUrl) return;

    const result = await firstValueFrom(
      this.dialogs.open<File | null>(
        new PolymorpheusComponent(ImageEditorDialogComponent),
        {
          size: 'l',
          data,
          appearance: 'fullscreen',
          closeable: false,
          dismissible: false,
        },
      ),
    );

    if (result) {
      this.photoControl.setValue(result);
    }
  }

  protected async onDeleteExistingPhoto(): Promise<void> {
    const data = this.effectiveAscentData();
    if (!data || !data.photo_path) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.deletePhotoTitle'),
        size: 's',
        data: {
          content: this.translate.instant('ascent.deletePhotoConfirm'),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      try {
        await this.ascents.deletePhoto(data.id, data.photo_path);
        this.isExistingPhotoDeleted.set(true);
      } catch (e) {
        console.error('[AscentForm] Error deleting photo', e);
      }
    }
  }

  async onDelete(): Promise<void> {
    const data = this.effectiveAscentData();
    if (!data) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.deleteTitle'),
        size: 'm',
        data: {
          content: this.translate.instant('ascent.deleteConfirm', {
            routeName: this.routeName(),
            date: data.date,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    try {
      await this.ascents.delete(data.id);
    } catch (e) {
      const error = e as Error;
      handleErrorToast(error, this.toast);
    } finally {
      this._dialogCtx?.completeWith(true);
    }
  }

  cancel(): void {
    this._dialogCtx?.completeWith(false);
  }
}
