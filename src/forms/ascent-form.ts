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
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, min, required, submit } from '@angular/forms/signals';

import { TuiDay } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  tuiDateFormatProvider,
  TuiError,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  type TuiDialogContext,
  TuiDialogService,
} from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiConfirmData,
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
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';
import { GlobalData } from '../services/global-data';
import { RoutesService } from '../services/routes.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';

import { ButtonAscentTypeComponent } from '../components/button-ascent-type';
import { CounterComponent } from '../components/counter';

import {
  AscentDialogData,
  AscentType,
  AscentTypes,
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../models';

import { handleErrorToast } from '../utils';

import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';

@Component({
  selector: 'app-ascent-form',
  imports: [
    CommonModule,
    FormsModule,
    FormField,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiCheckbox,
    TuiChevron,
    TuiDataListWrapper,
    TuiError,
    TuiFiles,
    TuiFileRejectedPipe,
    TuiIcon,
    TuiInputDate,
    TuiInputFiles,
    TuiLabel,
    TuiRating,
    TuiSelect,
    TuiTextarea,
    TuiTextfield,
    CounterComponent,
    ButtonAscentTypeComponent,
  ],
  providers: [tuiDateFormatProvider({ mode: 'DMY', separator: '/' })],
  template: `
    <form class="flex flex-col h-full" (submit.zoneless)="onSubmit($event)">
      <div class="flex-1 flex flex-col gap-6">
        <!-- WHEN DID YOU CLIMB IT? -->
        <section class="grid gap-3">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.when' | translate
          }}</span>
          <tui-textfield [tuiTextfieldCleaner]="false">
            <input
              tuiInputDate
              [max]="today"
              [ngModel]="model().date"
              (ngModelChange)="onDateChange($event)"
              name="date"
              autocomplete="off"
            />
            <tui-calendar *tuiTextfieldDropdown />
          </tui-textfield>
          @if (ascentForm.date().invalid() && ascentForm.date().touched()) {
            <tui-error [error]="'errors.required' | translate" />
          }
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
                <app-button-ascent-type
                  [type]="opt.id"
                  size="l"
                  [active]="ascentForm.type().value() === opt.id"
                  (click)="setType(opt.id)"
                />
                <button
                  type="button"
                  class="text-xs font-medium appearance-none bg-transparent border-none p-0"
                  (click)="setType(opt.id)"
                >
                  {{ opt.translate | translate }}
                </button>
              </div>
            }
          </div>

          <app-counter
            [ngModel]="model().attempts"
            (ngModelChange)="onAttemptsChange($event)"
            name="attempts"
            label="attempts"
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
              [formField]="$any(ascentForm.comment)"
              [placeholder]="'ascent.thoughtsPlaceholder' | translate"
              rows="5"
            ></textarea>
          </tui-textfield>
          <label class="flex items-center gap-2 cursor-pointer self-start">
            <input
              tuiCheckbox
              type="checkbox"
              [formField]="$any(ascentForm.private_ascent)"
              (click)="onPrivateClick($event)"
              autocomplete="off"
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
                  [ngModel]="model().photoControl"
                  (ngModelChange)="onPhotoFileChange($event)"
                  name="photoControl"
                  autocomplete="off"
                />
              </label>
            }

            <tui-files class="mt-2">
              @if (
                photoValue()
                  | tuiFileRejected
                    : { accept: 'image/*', maxFileSize: 5 * 1024 * 1024 }
                  | async;
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
                  <tui-file
                    [file]="file"
                    (remove)="removePhotoFile()"
                    (click.zoneless)="editPhoto(file)"
                  />
                  @if (previewUrl()) {
                    <div
                      class="mt-2 rounded-xl overflow-hidden relative group cursor-pointer"
                      (click.zoneless)="editPhoto(file)"
                    >
                      <img
                        [src]="previewUrl()"
                        class="w-full h-auto max-h-48 object-cover"
                        alt="Preview"
                      />
                      <div
                        class="absolute inset-0 bg-[var(--tui-background-neutral-1)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <tui-icon
                          icon="@tui.edit-2"
                          class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
                        />
                      </div>
                    </div>
                  }
                </div>
              }

              @if (existingPhotoUrl(); as photoUrl) {
                @if (!photoValue()) {
                  <div
                    class="rounded-xl overflow-hidden relative group cursor-pointer"
                    (click.zoneless)="editPhoto(null, photoUrl)"
                  >
                    <img
                      [src]="photoUrl"
                      class="w-full h-auto max-h-48 object-cover"
                      alt="Existing photo"
                    />
                    <div
                      class="absolute inset-0 bg-[var(--tui-background-neutral-1)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <tui-icon
                        icon="@tui.edit-2"
                        class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
                      />
                    </div>
                  </div>
                }
              }
            </tui-files>
          </div>
        </section>

        <!-- VIDEO URL -->
        <section class="grid gap-3">
          <tui-textfield
            [tuiTextfieldCleaner]="true"
            class="max-w-full overflow-hidden"
          >
            <label tuiLabel for="ascentVideo">Video URL (YouTube)</label>
            <input
              id="ascentVideo"
              tuiTextfield
              [formField]="$any(ascentForm.video_url)"
              placeholder="https://youtube.com/..."
              autocomplete="off"
            />
          </tui-textfield>
        </section>

        <!-- DID YOU LIKE IT? -->
        <section class="grid gap-3">
          <span class="text-sm font-semibold opacity-70 px-1">{{
            'ascent.didYouLikeIt' | translate
          }}</span>
          <div class="flex flex-wrap items-center gap-4">
            <tui-rating
              [max]="5"
              [ngModel]="model().rate"
              (ngModelChange)="onRateChange($event)"
              name="rate"
              class="text-primary"
            />
            <button
              tuiIconButton
              type="button"
              [appearance]="model().recommended ? 'primary' : 'secondary'"
              size="m"
              (click)="toggleBool('recommended')"
            >
              <tui-icon
                [icon]="
                  model().recommended ? '@tui.thumbs-up' : '@tui.thumbs-up'
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
              [appearance]="model().soft ? 'primary' : 'neutral'"
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
                  'grade' | translate
                }}</label>
                <input
                  tuiSelect
                  id="ascentGrade"
                  [ngModel]="model().grade"
                  (ngModelChange)="onGradeChange($event)"
                  name="grade"
                  autocomplete="off"
                />
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
              [appearance]="model().hard ? 'primary' : 'neutral'"
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
                    [appearance]="$any(model())[key] ? 'primary' : 'neutral'"
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
                    [appearance]="$any(model())[key] ? 'primary' : 'neutral'"
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
                    [appearance]="$any(model())[key] ? 'primary' : 'neutral'"
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
                    [appearance]="$any(model())[key] ? 'primary' : 'neutral'"
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
            {{ 'userInfo' | translate }} +
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
            {{ 'delete' | translate }}
          </button>
        }
        <div class="grow"></div>
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="cancel()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="
            ascentForm.date().invalid() || ascentForm.type().invalid()
          "
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'save' : 'create') | translate }}
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

  private readonly effectiveAscentData = computed(
    () => this.dialogAscentData ?? this.ascentData(),
  );

  private readonly routeName = computed(() => {
    const data = this.effectiveAscentData();
    return this.dialogRouteName || data?.route?.name || '?';
  });

  private readonly effectiveRouteId = computed(
    () =>
      this.dialogRouteId ??
      this.routeId() ??
      this.effectiveAscentData()?.route_id,
  );

  readonly isEdit = computed(() => !!this.effectiveAscentData());
  readonly showMore = signal(false);

  protected readonly photoValue = computed(() => this.model().photoControl);
  protected readonly previewUrl = signal<string | null>(null);

  protected readonly isExistingPhotoDeleted = signal(false);
  protected readonly isProcessingPhoto = signal(false);

  protected readonly existingPhotoResource = resource({
    params: () => {
      const data = this.effectiveAscentData();
      return data?.photo_path || null;
    },
    loader: async ({ params: path }) => {
      if (!path) return null;
      // Optimize for form preview: resize to 300px width
      return this.supabase.getAscentSignedUrl(path, {
        transform: { width: 300, quality: 60 },
      });
    },
  });
  protected readonly existingPhotoUrl = computed(() =>
    this.isExistingPhotoDeleted() ? null : this.existingPhotoResource.value(),
  );

  readonly today = TuiDay.currentLocal();

  model = signal({
    type: AscentTypes.RP as AscentType,
    rate: 0,
    comment: '',
    date: TuiDay.currentLocal(),
    attempts: null as number | null,
    private_ascent: false,
    recommended: false,
    soft: false,
    hard: false,
    grade: null as number | null,
    cruxy: false,
    athletic: false,
    sloper: false,
    endurance: false,
    technical: false,
    crimpy: false,
    slab: false,
    vertical: false,
    overhang: false,
    roof: false,
    bad_anchor: false,
    bad_bolts: false,
    high_first_bolt: false,
    lose_rock: false,
    bad_clipping_position: false,
    chipped: false,
    with_kneepad: false,
    no_score: false,
    first_ascent: false,
    traditional: false,
    video_url: null as string | null,
    photoControl: null as File | null,
  });

  ascentForm = form(this.model, (path) => {
    required(path.type);
    required(path.date);
    min(path.attempts, () => (this.model().type === AscentTypes.RP ? 2 : 1));
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
    {
      id: AscentTypes.ATTEMPT,
      translate: 'ascentTypes.attempt',
      icon: '@tui.circle-dashed',
      background: 'var(--tui-status-neutral)',
    },
  ];

  protected readonly climbingTypes: (keyof ReturnType<typeof this.model>)[] = [
    'cruxy',
    'athletic',
    'sloper',
    'endurance',
    'technical',
    'crimpy',
  ];
  protected readonly steepnessTypes: (keyof ReturnType<typeof this.model>)[] = [
    'slab',
    'vertical',
    'overhang',
    'roof',
  ];
  protected readonly safetyIssues: (keyof ReturnType<typeof this.model>)[] = [
    'bad_anchor',
    'bad_bolts',
    'high_first_bolt',
    'lose_rock',
    'bad_clipping_position',
  ];
  protected readonly otherInfo: (keyof ReturnType<typeof this.model>)[] = [
    'chipped',
    'with_kneepad',
    'no_score',
    'first_ascent',
    'traditional',
  ];

  protected readonly gradeItems = Object.entries(GRADE_NUMBER_TO_LABEL)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => ({ id: Number(k), label: v }));

  protected readonly gradeStringify = (grade: number): string =>
    grade === 0
      ? this.translate.instant('project')
      : GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || '';

  protected changeGrade(delta: number): void {
    const current = this.model().grade;
    if (current === null) {
      if (this.gradeItems.length > 0) {
        this.model.update((m) => ({ ...m, grade: this.gradeItems[0].id }));
      }
      return;
    }

    const currentIndex = this.gradeItems.findIndex((i) => i.id === current);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < this.gradeItems.length) {
      this.model.update((m) => ({
        ...m,
        grade: this.gradeItems[nextIndex].id,
      }));
    }
  }

  protected readonly gradeOptions = this.gradeItems.map((i) => i.id);

  constructor() {
    effect(() => {
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
    });

    effect(() => {
      const data = this.effectiveAscentData();
      if (!data) return;
      untracked(() => {
        this.populateForm(data);
      });
    });

    // Handle tries auto-disable for OS/Flash
    effect(() => {
      const type = this.model().type;
      untracked(() => {
        this.updateTriesState(type);
      });
    });

    // Handle recommended -> rating
    effect(() => {
      const recommended = this.model().recommended;
      untracked(() => {
        if (recommended && this.model().rate !== 5) {
          this.model.update((m) => ({ ...m, rate: 5 }));
        }
      });
    });

    // Default grade if provided and not editing
    if (!this.effectiveAscentData() && this.dialogGrade !== undefined) {
      this.model.update((m) => ({ ...m, grade: this.dialogGrade! }));
    }

    // Auto-open editor when a new file is selected from file input
    effect(() => {
      const file = this.model().photoControl;
      untracked(() => {
        if (file && !this.isProcessingPhoto()) {
          this.isProcessingPhoto.set(true);
          this.editPhoto(file, undefined);
        }
      });
    });
  }

  protected async onPrivateClick(event: MouseEvent) {
    if (this.model().private_ascent) return;

    event.preventDefault();

    const data: TuiConfirmData = {
      content: this.translate.instant('ascent.privateConfirmation'),
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.private'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.model.update((m) => ({ ...m, private_ascent: true }));
    }
  }

  private updateTriesState(type: string | null | undefined): void {
    if (type === AscentTypes.OS || type === AscentTypes.F) {
      if (this.model().attempts !== 1) {
        this.model.update((m) => ({ ...m, attempts: 1 }));
      }
    } else if (type === AscentTypes.RP) {
      if (this.model().attempts === 1) {
        this.model.update((m) => ({ ...m, attempts: null }));
      }
    }
  }

  private populateForm(data: RouteAscentDto): void {
    let dateObj = TuiDay.currentLocal();
    if (data.date) {
      const d = new Date(data.date);
      dateObj = new TuiDay(d.getFullYear(), d.getMonth(), d.getDate());
    }

    this.model.set({
      type: (data.type ?? AscentTypes.RP) as AscentType,
      rate: data.rate ?? 0,
      comment: data.comment ?? '',
      attempts: data.attempts ?? null,
      private_ascent: !!data.private_ascent,
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
      video_url: data.video_url ?? null,
      date: dateObj,
      photoControl: null,
    });
  }

  protected toggleBool(key: keyof ReturnType<typeof this.model>): void {
    const currentVal = this.model()[key];
    if (typeof currentVal !== 'boolean') return;
    const newVal = !currentVal;

    this.model.update((m) => {
      const updated = { ...m, [key]: newVal };
      if (key === 'soft' && newVal) updated.hard = false;
      if (key === 'hard' && newVal) updated.soft = false;
      return updated;
    });
  }

  protected async attemptSelected(): Promise<void> {
    const data: TuiConfirmData = {
      content: this.translate.instant('ascent.attemptPrivateConfirmation'),
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascentTypes.attempt'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.model.update((m) => ({
        ...m,
        type: AscentTypes.ATTEMPT,
        private_ascent: true,
      }));
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
    this.model.update((m) => ({
      ...m,
      date: new TuiDay(d.getFullYear(), d.getMonth(), d.getDate()),
    }));
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    submit(this.ascentForm, async () => {
      const route_id = this.effectiveRouteId();
      const ascentData = this.effectiveAscentData();
      const user_id = ascentData
        ? ascentData.user_id
        : this.supabase.authUser()?.id;
      if (!user_id) return;

      const { photoControl, ...otherValues } = this.model();
      const payload: RouteAscentInsertDto = {
        ...otherValues,
        date: `${otherValues.date.year}-${String(otherValues.date.month + 1).padStart(2, '0')}-${String(otherValues.date.day).padStart(2, '0')}`,
        type: otherValues.type,
        rate: otherValues.rate === 0 ? null : otherValues.rate,
        video_url: otherValues.video_url || null,
        route_id: route_id as number,
        user_id: user_id,
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
        const photoFile = photoControl;
        if (savedAscent && photoFile) {
          await this.ascents.uploadPhoto(savedAscent.id, photoFile);
        }
      } catch (e) {
        const error = e as Error;
        handleErrorToast(error, this.toast);
      } finally {
        this._dialogCtx?.completeWith(true);
      }
    });
  }

  protected removePhotoFile(): void {
    this.model.update((m) => ({ ...m, photoControl: null }));
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    let urlToEdit = imageUrl;

    // If editing existing photo, fetch full resolution
    if (!file && imageUrl && this.existingPhotoUrl() === imageUrl) {
      const data = this.effectiveAscentData();
      if (data?.photo_path) {
        const fullUrl = await this.supabase.getAscentSignedUrl(data.photo_path);
        if (fullUrl) {
          urlToEdit = fullUrl;
        }
      }
    }

    const data = {
      file: file ?? undefined,
      imageUrl: urlToEdit ?? undefined,
      aspectRatios: [
        { titleKey: '1:1', descriptionKey: '1:1', ratio: 1 },
        { titleKey: '4:5', descriptionKey: '4:5', ratio: 4 / 5 },
        { titleKey: '16:9', descriptionKey: '16:9', ratio: 16 / 9 },
      ],
      allowFree: false,
      resizeToWidth: 1200,
      imageQuality: 75,
    };

    if (!data.file && !data.imageUrl) {
      this.isProcessingPhoto.set(false);
      return;
    }

    const result = await firstValueFrom(
      this.dialogs.open<File | null>(
        new PolymorpheusComponent(ImageEditorDialogComponent),
        {
          data,
          appearance: 'fullscreen',
          closable: false,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    );

    // Reset processing flag
    this.isProcessingPhoto.set(false);

    if (result) {
      // If we got a result, set it without triggering the effect again
      this.model.update((m) => ({ ...m, photoControl: result }));
      // Manually trigger preview update
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(result);
    } else {
      // User canceled, clear the photo
      this.model.update((m) => ({ ...m, photoControl: null }));
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
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      try {
        await this.ascents.deletePhoto(data.id);
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
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
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

  setType(id: AscentType): void {
    if (id === 'attempt') {
      this.attemptSelected();
    } else {
      this.model.update((m) => ({ ...m, type: id }));
    }
  }

  onDateChange(date: TuiDay | null): void {
    if (date) {
      this.model.update((m) => ({ ...m, date }));
    }
  }

  onAttemptsChange(attempts: number | null): void {
    this.model.update((m) => ({ ...m, attempts }));
  }

  onPhotoFileChange(file: File | null): void {
    this.model.update((m) => ({ ...m, photoControl: file }));
  }

  onRateChange(rate: number): void {
    this.model.update((m) => ({ ...m, rate }));
  }

  onGradeChange(grade: number | null): void {
    this.model.update((m) => ({ ...m, grade }));
  }
}
