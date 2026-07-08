import { CommonModule, Location } from '@angular/common';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiInput,
  TuiTextfield,
  TuiNumberFormat,
  TuiCheckbox,
  TuiAppearance,
  TuiDropdown,
} from '@taiga-ui/core';
import {
  TuiTextarea,
  TuiInputNumber,
  TuiFiles,
  TuiTabs,
  TuiSelect,
  TuiDataListWrapper,
  TuiChevron,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';
import { GlobalData } from '../../services/global-data';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';
import { MapService } from '../../services/map.service';
import {
  handleErrorToast,
  slugify,
  COMMON_IMAGE_EDITOR_CONFIG,
  fileToDataUrl,
  createNewPhoto,
  NewPhoto,
  reorderGallery,
} from '../../utils';
import { IndoorCenterDto, IndoorSchedule, Json } from '../../models';
import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'app-indoor-center-form',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiError,
    TuiInput,
    TuiInputNumber,
    TuiLabel,
    TuiNumberFormat,
    TuiTextarea,
    TuiTextfield,
    TuiFiles,
    TuiIcon,
    TuiLoader,
    TuiTabs,
    TuiCheckbox,
    TuiAppearance,
    TuiDropdown,
    TuiSelect,
    TuiDataListWrapper,
    TuiChevron,
    CdkDrag,
    CdkDropList,
  ],
  template: `
    @if (isEdit()) {
      <tui-tabs [(activeItemIndex)]="activeTabIndex" class="mb-4">
        <button tuiTab>{{ 'details' | translate }}</button>
        <button tuiTab>{{ 'indoor.schedule' | translate }}</button>
        <button tuiTab>{{ 'indoor.vouchers' | translate }}</button>
      </tui-tabs>
    }

    <form class="flex flex-col grow" (submit.zoneless)="onSubmit($event)">
      <div class="grow min-h-[400px]">
        @switch (activeTabIndex()) {
          @case (0) {
            <div class="grid gap-4">
              <tui-textfield class="block">
                <label tuiLabel for="center-name">{{
                  'name' | translate
                }}</label>
                <input
                  tuiInput
                  id="center-name"
                  [formField]="centerForm.name"
                  type="text"
                  autocomplete="off"
                />
              </tui-textfield>
              @if (centerForm.name().invalid() && centerForm.name().touched()) {
                <tui-error [error]="'errors.required' | translate" />
              }

              <tui-textfield class="block">
                <label tuiLabel for="center-city">{{
                  'city' | translate
                }}</label>
                <input
                  tuiInput
                  id="center-city"
                  [formField]="centerForm.city"
                  type="text"
                  autocomplete="off"
                />
              </tui-textfield>

              <tui-textfield class="block">
                <label tuiLabel for="center-desc">{{
                  'description' | translate
                }}</label>
                <textarea
                  tuiTextarea
                  id="center-desc"
                  [formField]="$any(centerForm.description)"
                  class="h-32"
                ></textarea>
              </tui-textfield>

              <tui-textfield class="block">
                <label tuiLabel for="center-warning">{{
                  'indoor.warning' | translate
                }}</label>
                <textarea
                  tuiTextarea
                  id="center-warning"
                  [formField]="$any(centerForm.warning)"
                  class="h-24"
                ></textarea>
              </tui-textfield>

              <div class="flex flex-wrap items-center gap-4">
                <h3 class="font-bold text-lg">{{ 'location' | translate }}</h3>
                <button
                  tuiButton
                  appearance="secondary-grayscale"
                  size="s"
                  type="button"
                  iconStart="@tui.map-pin"
                  (click.zoneless)="pickLocation()"
                >
                  {{ 'pickOnMap' | translate }}
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <tui-textfield [tuiTextfieldCleaner]="false">
                  <label tuiLabel for="lat">{{ 'lat' | translate }}</label>
                  <input
                    tuiInputNumber
                    id="lat"
                    [ngModel]="model().latitude"
                    (ngModelChange)="onLatChange($event)"
                    name="latitude"
                    [tuiNumberFormat]="{ precision: 6 }"
                    (paste)="onPasteLocation($event)"
                    (change.zoneless)="sanitizeCoordinates()"
                    autocomplete="off"
                  />
                </tui-textfield>
                <tui-textfield [tuiTextfieldCleaner]="false">
                  <label tuiLabel for="lng">{{ 'lng' | translate }}</label>
                  <input
                    tuiInputNumber
                    id="lng"
                    [tuiNumberFormat]="{ precision: 6 }"
                    [ngModel]="model().longitude"
                    (ngModelChange)="onLngChange($event)"
                    name="longitude"
                    (change.zoneless)="sanitizeCoordinates()"
                    autocomplete="off"
                  />
                </tui-textfield>
              </div>

              <!-- Gallery -->
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between px-1">
                  <h3 class="font-bold text-lg">
                    {{ 'merchandising.items.gallery' | translate }}
                  </h3>
                  <label tuiInputFiles>
                    <input
                      accept="image/*"
                      type="file"
                      tuiInputFiles
                      multiple
                      [ngModel]="null"
                      [ngModelOptions]="{ standalone: true }"
                      (change)="onFilesChange($event)"
                    />
                    <button
                      tuiButton
                      type="button"
                      appearance="secondary-grayscale"
                      size="s"
                      iconStart="@tui.plus"
                    >
                      {{ 'merchandising.items.addImage' | translate }}
                    </button>
                  </label>
                </div>

                <div
                  class="grid grid-cols-2 sm:grid-cols-4 gap-3"
                  cdkDropList
                  cdkDropListOrientation="mixed"
                  (cdkDropListDropped)="dropImage($event)"
                >
                  @for (img of model().gallery_urls; track img) {
                    <div
                      cdkDrag
                      class="relative aspect-square rounded-xl overflow-hidden border border-(--tui-border-normal) group cursor-grab active:cursor-grabbing"
                    >
                      <img
                        [src]="supabase.getPublicUrl('indoor-assets', img)"
                        class="w-full h-full object-cover"
                        alt="Gallery image"
                      />
                      <div
                        class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div
                          class="bg-(--tui-background-base) rounded-xl p-0.5"
                        >
                          <button
                            tuiButton
                            type="button"
                            appearance="destructive"
                            size="s"
                            (click)="removeExistingImage(img)"
                          >
                            <tui-icon icon="@tui.trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  }

                  @for (item of newPhotos(); track item.id) {
                    <div
                      cdkDrag
                      class="relative aspect-square rounded-xl overflow-hidden border border-accent border-dashed group cursor-grab active:cursor-grabbing"
                    >
                      <img
                        [src]="item.preview"
                        class="w-full h-full object-cover"
                        alt="New photo"
                      />
                      <div
                        class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div
                          class="bg-(--tui-background-base) rounded-xl p-0.5"
                        >
                          <button
                            tuiButton
                            type="button"
                            appearance="destructive"
                            size="s"
                            (click)="removeNewPhoto(item.id)"
                          >
                            <tui-icon icon="@tui.trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @case (1) {
            <div class="flex flex-col gap-4">
              @for (d of scheduleDays(); track d.day) {
                <div
                  class="flex flex-wrap items-center gap-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-(--tui-border-normal)"
                >
                  <span class="font-bold w-24 capitalize">{{
                    d.day | translate
                  }}</span>

                  <label class="flex items-center gap-2">
                    <input
                      tuiCheckbox
                      type="checkbox"
                      [ngModel]="d.closed"
                      (ngModelChange)="onClosedChange(d.day, $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                    <span>{{ 'indoor.closed' | translate }}</span>
                  </label>

                  @if (!d.closed) {
                    <div class="flex items-center gap-2">
                      <tui-textfield tuiTextfieldSize="s" class="w-36">
                        <input
                          tuiInput
                          type="time"
                          [ngModel]="d.open"
                          (ngModelChange)="onTimeChange(d.day, 'open', $event)"
                          [ngModelOptions]="{ standalone: true }"
                        />
                      </tui-textfield>
                      <span>-</span>
                      <tui-textfield tuiTextfieldSize="s" class="w-36">
                        <input
                          tuiInput
                          type="time"
                          [ngModel]="d.close"
                          (ngModelChange)="onTimeChange(d.day, 'close', $event)"
                          [ngModelOptions]="{ standalone: true }"
                        />
                      </tui-textfield>
                    </div>

                    <label class="flex items-center gap-2 ml-4">
                      <input
                        tuiCheckbox
                        type="checkbox"
                        [ngModel]="d.hasSplit"
                        (ngModelChange)="onSplitChange(d.day, $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                      <span>Jornada partida</span>
                    </label>

                    @if (d.hasSplit) {
                      <div class="flex items-center gap-2">
                        <tui-textfield tuiTextfieldSize="s" class="w-36">
                          <input
                            tuiInput
                            type="time"
                            [ngModel]="d.open2"
                            (ngModelChange)="
                              onTimeChange(d.day, 'open2', $event)
                            "
                            [ngModelOptions]="{ standalone: true }"
                          />
                        </tui-textfield>
                        <span>-</span>
                        <tui-textfield tuiTextfieldSize="s" class="w-36">
                          <input
                            tuiInput
                            type="time"
                            [ngModel]="d.close2"
                            (ngModelChange)="
                              onTimeChange(d.day, 'close2', $event)
                            "
                            [ngModelOptions]="{ standalone: true }"
                          />
                        </tui-textfield>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          @case (2) {
            <div class="flex flex-col gap-6 max-w-2xl">
              <!-- Compact Create Voucher Form -->
              <div
                class="flex flex-col gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-850"
              >
                <!-- First line: Name -->
                <div class="w-full">
                  <tui-textfield>
                    <label tuiLabel for="new-v-name">{{
                      'name' | translate
                    }}</label>
                    <input
                      tuiInput
                      id="new-v-name"
                      [(ngModel)]="newVoucherName"
                      name="newVoucherName"
                      autocomplete="off"
                      placeholder="Ej. Pase diario, Bono de 10"
                    />
                  </tui-textfield>
                </div>

                <!-- Second line: Description (Textarea) -->
                <div class="w-full">
                  <tui-textfield class="block">
                    <label tuiLabel for="new-v-desc">{{
                      'description' | translate
                    }}</label>
                    <textarea
                      tuiTextarea
                      id="new-v-desc"
                      [(ngModel)]="newVoucherDescription"
                      name="newVoucherDescription"
                      placeholder="Ej. Acceso libre por un día"
                      class="h-20"
                    ></textarea>
                  </tui-textfield>
                </div>

                <!-- Third line: Type and Price together, plus Add button -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <!-- Kind (Type) -->
                  <tui-textfield
                    class="w-full"
                    tuiChevron
                    [stringify]="stringifyVoucherKind"
                  >
                    <label tuiLabel for="new-v-kind">{{
                      'indoor.voucherKind' | translate
                    }}</label>
                    <input
                      tuiSelect
                      id="new-v-kind"
                      [(ngModel)]="newVoucherKind"
                      name="newVoucherKind"
                      autocomplete="off"
                    />
                    <tui-data-list-wrapper
                      *tuiDropdown
                      [items]="['pass', 'subscription']"
                    ></tui-data-list-wrapper>
                  </tui-textfield>

                  <!-- Price -->
                  <tui-textfield class="w-full">
                    <label tuiLabel for="new-v-price">{{
                      'price' | translate
                    }}</label>
                    <input
                      tuiInputNumber
                      id="new-v-price"
                      [(ngModel)]="newVoucherPrice"
                      name="newVoucherPrice"
                      [tuiNumberFormat]="{ precision: 2 }"
                      autocomplete="off"
                      placeholder="0.00"
                    />
                    <span class="tui-textfield__suffix">€</span>
                  </tui-textfield>

                  <!-- Add Button -->
                  <button
                    tuiButton
                    type="button"
                    appearance="primary"
                    class="w-full font-bold"
                    [disabled]="!newVoucherName"
                    (click.zoneless)="addLocalVoucher($event)"
                  >
                    <tui-icon icon="@tui.plus" />
                    {{ 'add' | translate }}
                  </button>
                </div>
              </div>

              <!-- Sleek Vouchers List -->
              @if (activeLocalVouchers().length > 0) {
                <div class="flex flex-col gap-2">
                  @for (v of activeLocalVouchers(); track $index) {
                    <div
                      class="flex items-center justify-between p-4 rounded-2xl tui-appearance-floating"
                      tuiAppearance="floating"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-xl tui-appearance-primary flex items-center justify-center"
                          tuiAppearance="primary"
                        >
                          <tui-icon
                            [icon]="
                              v.kind === 'subscription'
                                ? '@tui.id-card'
                                : '@tui.ticket'
                            "
                            class="text-lg"
                          />
                        </div>
                        <div class="flex flex-col">
                          <span class="font-bold text-base">{{ v.name }}</span>
                          @if (v.description) {
                            <span class="text-xs opacity-60">{{
                              v.description
                            }}</span>
                          }
                        </div>
                      </div>

                      <div class="flex items-center gap-4">
                        <span
                          class="text-base font-extrabold px-3 py-1.5 rounded-xl"
                          tuiAppearance="primary"
                        >
                          {{ v.price | number: '1.2-2' }} €
                        </span>
                        <button
                          tuiIconButton
                          appearance="flat-grayscale"
                          size="s"
                          iconStart="@tui.edit"
                          type="button"
                          class="rounded-full! text-neutral-500"
                          [attr.aria-label]="'edit' | translate"
                          (click.zoneless)="editLocalVoucher(v, $event)"
                        ></button>
                        <button
                          tuiIconButton
                          appearance="flat-grayscale"
                          size="s"
                          iconStart="@tui.trash"
                          type="button"
                          class="rounded-full! text-red-550"
                          [attr.aria-label]="'delete' | translate"
                          (click.zoneless)="deleteLocalVoucher(v, $event)"
                        ></button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div
                  class="p-10 text-center opacity-50 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl"
                >
                  {{ 'empty' | translate }}
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Unified Footer Action Buttons -->
      <div
        class="flex flex-wrap gap-2 justify-end mt-6 pt-4 border-t border-(--tui-border-normal)"
      >
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <tui-loader [loading]="isSaving() || isUploading()" [overlay]="true">
          <button
            [disabled]="centerForm.name().invalid()"
            tuiButton
            appearance="primary"
            type="submit"
          >
            {{ (isEdit() ? 'save' : 'create') | translate }}
          </button>
        </tui-loader>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class IndoorCenterFormComponent {
  private readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  protected readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  protected readonly mapService = inject(MapService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { centerData?: Partial<IndoorCenterDto> }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { centerData?: Partial<IndoorCenterDto> }
        >
      >();
    } catch {
      return null;
    }
  })();

  centerData: InputSignal<Partial<IndoorCenterDto> | undefined> = input<
    Partial<IndoorCenterDto> | undefined
  >(undefined);

  private readonly effectiveCenterData: Signal<
    Partial<IndoorCenterDto> | undefined
  > = computed(() => this._dialogCtx?.data?.centerData ?? this.centerData());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveCenterData()?.id,
  );

  protected readonly activeTabIndex = signal(0);
  protected readonly centerId = computed(() => this.effectiveCenterData()?.id);

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  protected readonly newPhotos = signal<NewPhoto[]>([]);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  model = signal<{
    name: string;
    slug: string;
    city: string;
    description: string;
    warning: string;
    latitude: number | null;
    longitude: number | null;
    gallery_urls: string[];
  }>({
    name: '',
    slug: '',
    city: '',
    description: '',
    warning: '',
    latitude: null,
    longitude: null,
    gallery_urls: [],
  });

  centerForm = form(this.model, (path) => {
    required(path.name);
  });

  private editingId: string | null = null;

  protected readonly weekDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  protected readonly scheduleForm = signal<
    Record<
      string,
      {
        closed: boolean;
        open: string;
        close: string;
        hasSplit: boolean;
        open2: string;
        close2: string;
      }
    >
  >({});

  protected readonly scheduleDays = computed(() => {
    const formVal = this.scheduleForm();
    return this.weekDays.map((day) => ({
      day,
      ...formVal[day],
    }));
  });

  // Local Vouchers configuration
  protected readonly localVouchers = signal<
    {
      id?: string;
      name: string;
      price: number;
      kind?: string;
      description?: string | null;
      is_deleted?: boolean;
    }[]
  >([]);
  protected readonly activeLocalVouchers = computed(() =>
    this.localVouchers().filter((v) => !v.is_deleted),
  );
  protected newVoucherName = '';
  protected newVoucherPrice: number | null = null;
  protected newVoucherKind = 'pass';
  protected newVoucherDescription = '';
  protected readonly stringifyVoucherKind = (kind: string): string => {
    return this.translate.instant('indoor.voucherKinds.' + kind);
  };

  constructor() {
    effect(() => {
      const data = this.effectiveCenterData();
      if (!data) return;
      this.editingId = data.id || null;
      this.model.update((m) => ({
        ...m,
        name: data.name || '',
        slug: data.slug || '',
        city: data.city || '',
        description: data.description || '',
        warning: data.warning || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        gallery_urls: data.gallery_urls || [],
      }));

      // Initialize Schedule
      const schedule = (data.schedule as unknown as IndoorSchedule) || {
        normal: {},
      };
      const defaultSchedule = this.weekDays.reduce(
        (acc, day) => {
          const s = schedule.normal?.[day] || {
            closed: true,
            open: '09:00',
            close: '21:00',
          };
          acc[day] = {
            closed: !!s.closed,
            open: s.open || '09:00',
            close: s.close || '21:00',
            hasSplit: !!(s.open2 && s.close2),
            open2: s.open2 || '16:00',
            close2: s.close2 || '21:00',
          };
          return acc;
        },
        {} as Record<
          string,
          {
            closed: boolean;
            open: string;
            close: string;
            hasSplit: boolean;
            open2: string;
            close2: string;
          }
        >,
      );
      this.scheduleForm.set(defaultSchedule);
    });

    // Fetch existing vouchers on edit
    effect(async () => {
      const id = this.centerId();
      if (!id) {
        this.localVouchers.set([]);
        return;
      }
      try {
        const list = await this.indoor.getCenterVouchers(id);
        untracked(() => {
          this.localVouchers.set(
            list.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description,
            })),
          );
        });
      } catch (e) {
        console.error('[IndoorCenterFormComponent] Error loading vouchers:', e);
      }
    });

    // Auto-slug generation
    effect(async () => {
      if (this.isEdit()) return;
      const name = this.model().name;
      if (!name) return;

      const baseSlug = slugify(name);
      const uniqueSlug = await this.supabase.getUniqueSlug(
        'indoor_centers',
        baseSlug,
      );

      untracked(() => {
        const currentSlug = this.model().slug;
        if (currentSlug !== uniqueSlug) {
          this.model.update((m) => ({ ...m, slug: uniqueSlug }));
        }
      });
    });
  }

  protected addLocalVoucher(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.newVoucherName) return;
    const name = this.newVoucherName;
    const price = Number(this.newVoucherPrice) || 0;
    const kind = this.newVoucherKind;
    const description = this.newVoucherDescription || null;
    this.localVouchers.update((list) => [
      ...list,
      { name, price, kind, description },
    ]);
    this.newVoucherName = '';
    this.newVoucherPrice = null;
    this.newVoucherKind = 'pass';
    this.newVoucherDescription = '';
  }

  protected editLocalVoucher(
    v: {
      id?: string;
      name: string;
      price: number;
      kind?: string;
      description?: string | null;
    },
    event?: Event,
  ): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Populate form fields with the voucher details to edit
    this.newVoucherName = v.name;
    this.newVoucherPrice = v.price;
    this.newVoucherKind = v.kind || 'pass';
    this.newVoucherDescription = v.description || '';

    // Mark as deleted so it gets removed from the list when the new one is added
    this.deleteLocalVoucher(v);
  }

  protected deleteLocalVoucher(
    v: {
      id?: string;
      name: string;
      price: number;
      kind?: string;
      description?: string | null;
    },
    event?: Event,
  ): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.localVouchers.update((list) => {
      return list.map((item) => {
        if (item === v || (v.id && item.id === v.id)) {
          return { ...item, is_deleted: true };
        }
        return item;
      });
    });
  }

  protected onClosedChange(day: string, closed: boolean): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        closed,
      },
    }));
  }

  protected onSplitChange(day: string, hasSplit: boolean): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        hasSplit,
      },
    }));
  }

  protected onTimeChange(
    day: string,
    field: 'open' | 'close' | 'open2' | 'close2',
    value: string,
  ): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        [field]: value,
      },
    }));
  }

  async onFilesChange(event: Event): Promise<void> {
    const inputVal = event.target as HTMLInputElement;
    if (!inputVal.files || inputVal.files.length === 0) return;

    const fileArray = Array.from(inputVal.files);
    inputVal.value = '';

    for (const file of fileArray) {
      await this.editPhoto(file);
    }
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
    };

    if (!data.file && !data.imageUrl) return;

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

    if (result) {
      const preview = await fileToDataUrl(result);
      this.newPhotos.update((photos) => [
        ...photos,
        createNewPhoto(result, preview),
      ]);
    }
  }

  removeExistingImage(url: string): void {
    this.model.update((m) => ({
      ...m,
      gallery_urls: m.gallery_urls.filter((u) => u !== url),
    }));
  }

  removeNewPhoto(id: string): void {
    this.newPhotos.update((photos) => photos.filter((p) => p.id !== id));
  }

  dropImage(event: CdkDragDrop<unknown[]>): void {
    const { imageUrls, newPhotos } = reorderGallery(
      event,
      this.model().gallery_urls,
      this.newPhotos(),
    );
    this.model.update((m) => ({ ...m, gallery_urls: imageUrls }));
    this.newPhotos.set(newPhotos);
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.centerForm, async () => {
      this.isSaving.set(true);
      try {
        const modelVal = this.model();
        const newPhotoUrls: string[] = [];

        // 1. Save new photos if any
        if (this.newPhotos().length > 0) {
          this.isUploading.set(true);
          const centerIdVal = this.editingId;
          if (!centerIdVal)
            throw new Error('Cannot upload photos without a center ID');

          for (const item of this.newPhotos()) {
            const path = await this.indoor.uploadAsset(centerIdVal, item.file);
            if (path) {
              newPhotoUrls.push(path);
            }
          }
        }

        // 2. Prepare Center Details and Schedule payload
        const normalSchedule: Record<
          string,
          {
            closed: boolean;
            open: string | null;
            close: string | null;
            open2: string | null;
            close2: string | null;
          }
        > = {};
        const sf = this.scheduleForm();
        for (const day of this.weekDays) {
          const d = sf[day];
          normalSchedule[day] = {
            closed: d.closed,
            open: d.closed ? null : d.open,
            close: d.closed ? null : d.close,
            open2: !d.closed && d.hasSplit ? d.open2 : null,
            close2: !d.closed && d.hasSplit ? d.close2 : null,
          };
        }
        const schedulePayload = { normal: normalSchedule };

        const payload: Omit<IndoorCenterDto, 'id' | 'created_at'> = {
          name: modelVal.name,
          slug: modelVal.slug,
          city: modelVal.city || null,
          description: modelVal.description || null,
          warning: modelVal.warning || null,
          avatar_url: this.effectiveCenterData()?.avatar_url ?? null,
          latitude: modelVal.latitude,
          longitude: modelVal.longitude,
          contact_info: this.effectiveCenterData()?.contact_info ?? null,
          country: this.effectiveCenterData()?.country ?? null,
          gallery_urls: [...modelVal.gallery_urls, ...newPhotoUrls],
          schedule: schedulePayload as unknown as Json,
          location: this.effectiveCenterData()?.location ?? null,
        };

        // 3. Save center and retrieve center ID
        let savedCenterId = this.editingId;
        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.indoor.updateCenter(this.editingId, payload);
        } else {
          const newCenter = await this.indoor.createCenter(payload);
          if (!newCenter) throw new Error('Failed to create center');
          savedCenterId = newCenter.id;
        }

        if (!savedCenterId) {
          throw new Error('Failed to get center ID after save');
        }

        // 4. Save/Sync Vouchers in database
        const vouchersToSync = this.localVouchers();
        for (const v of vouchersToSync) {
          if (v.is_deleted) {
            if (v.id) {
              await this.indoor.deleteVoucher(v.id);
            }
          } else if (v.id) {
            await this.indoor.updateVoucher(v.id, {
              center_id: savedCenterId,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description || null,
              duration_days: 0,
              sessions_count: null,
              active: true,
            });
          } else {
            await this.indoor.createVoucher({
              center_id: savedCenterId,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description || null,
              duration_days: 0,
              sessions_count: null,
              active: true,
            });
          }
        }

        this.toast.success(
          this.translate.instant('merchandising.items.saveSuccess'),
        );

        if (this._dialogCtx) {
          this._dialogCtx.completeWith(true);
        } else {
          this.global.indoorCentersResource.reload();
          this.global.editingMode.set(false);
        }
      } catch (e) {
        const error = e as Error;
        console.error('[IndoorCenterFormComponent] Error submitting:', e);
        handleErrorToast(error, this.toast);
      } finally {
        this.isSaving.set(false);
        this.isUploading.set(false);
      }
    });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  async pickLocation(): Promise<void> {
    const result = await import('rxjs').then((m) =>
      m.firstValueFrom(
        this.mapService.pickLocation(
          this.model().latitude,
          this.model().longitude,
        ),
      ),
    );
    if (result) {
      this.model.update((m) => ({
        ...m,
        latitude: result.lat,
        longitude: result.lng,
      }));
    }
  }

  onLatChange(value: number | null): void {
    this.model.update((m) => ({ ...m, latitude: value }));
  }

  onLngChange(value: number | null): void {
    this.model.update((m) => ({ ...m, longitude: value }));
  }

  onPasteLocation(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const coords = this.mapService.parseCoordinates(text);
    if (coords) {
      event.preventDefault();
      this.model.update((m) => ({
        ...m,
        latitude: coords.lat,
        longitude: coords.lng,
      }));
    }
  }

  sanitizeCoordinates(): void {
    const lat = this.model().latitude;
    const lng = this.model().longitude;
    this.model.update((m) => ({
      ...m,
      latitude: lat != null ? parseFloat(lat.toFixed(6)) : null,
      longitude: lng != null ? parseFloat(lng.toFixed(6)) : null,
    }));
  }
}
