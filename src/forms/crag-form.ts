import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiNumberFormat,
  TuiTextfield,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { TuiInputNumber, TuiTextarea, TuiInputChip } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { CragsService } from '../services/crags.service';
import { MapService } from '../services/map.service';
import { ToastService } from '../services/toast.service';

import { CounterComponent } from '../components/counter';

import { handleErrorToast, slugify } from '../utils';

interface MinimalCrag {
  id: number;
  area_id: number;
  name: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  approach?: number | null;
  description_es?: string | null;
  description_en?: string | null;
  warning_es?: string | null;
  warning_en?: string | null;
}

@Component({
  selector: 'app-crag-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiError,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiInputNumber,
    TuiTextarea,
    TuiNumberFormat,
    TuiInputChip,
    CounterComponent,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="crag-name">{{ 'name' | translate }}</label>
        <input
          tuiTextfield
          id="crag-name"
          [formControl]="name"
          type="text"
          required
          [invalid]="name.invalid && name.touched"
        />
        @if (name.invalid && name.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      @if (isEdit()) {
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="crag-slug">{{ 'slug' | translate }}</label>
          <input
            tuiTextfield
            id="crag-slug"
            [formControl]="slug"
            type="text"
            required
            [invalid]="slug.invalid && slug.touched"
          />
          @if (slug.invalid && slug.touched) {
            <tui-error [error]="'errors.required' | translate" />
          }
        </tui-textfield>
      }

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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="grid grid-cols-2 gap-4">
          <tui-textfield [tuiTextfieldCleaner]="false">
            <label tuiLabel for="lat">{{ 'lat' | translate }}</label>
            <input
              tuiInputNumber
              id="lat"
              [formControl]="latitude"
              [min]="-90"
              [max]="90"
              [tuiNumberFormat]="{ precision: 6 }"
              (paste)="onPasteLocation($event)"
              (change.zoneless)="
                mapService.sanitizeCoordinates(latitude, longitude)
              "
            />
          </tui-textfield>
          <tui-textfield [tuiTextfieldCleaner]="false">
            <label tuiLabel for="lng">{{ 'lng' | translate }}</label>
            <input
              tuiInputNumber
              id="lng"
              [min]="-180"
              [max]="180"
              [tuiNumberFormat]="{ precision: 6 }"
              [formControl]="longitude"
              (change.zoneless)="
                mapService.sanitizeCoordinates(latitude, longitude)
              "
            />
          </tui-textfield>
        </div>
        <app-counter
          [formControl]="approach"
          label="approach"
          suffix="min."
          [min]="0"
        />
      </div>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-es">{{ 'description_es' | translate }}</label>
        <textarea
          tuiTextarea
          id="desc-es"
          [formControl]="description_es"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-en">{{ 'description_en' | translate }}</label>
        <textarea
          tuiTextarea
          id="desc-en"
          [formControl]="description_en"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-es">{{ 'warning_es' | translate }}</label>
        <textarea
          tuiTextarea
          id="warn-es"
          [formControl]="warning_es"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-en">{{ 'warning_en' | translate }}</label>
        <textarea
          tuiTextarea
          id="warn-en"
          [formControl]="warning_en"
          rows="3"
        ></textarea>
      </tui-textfield>

      @if (isEdit()) {
        <tui-textfield multi class="block">
          <label tuiLabel for="eight-anu-slugs">
            {{ 'import8a.slugs' | translate }}
          </label>
          <input
            tuiInputChip
            id="eight-anu-slugs"
            [formControl]="eight_anu_sector_slugs"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>
      }

      <div class="flex flex-wrap gap-2 justify-end">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="
            name.invalid ||
            (isEdit() && slug.invalid) ||
            (!name.dirty && !isEdit())
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
export class CragFormComponent {
  protected readonly mapService = inject(MapService);
  private readonly crags = inject(CragsService);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { areaId?: number; cragData?: MinimalCrag }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { areaId?: number; cragData?: MinimalCrag }
        >
      >();
    } catch {
      return null;
    }
  })();

  // Alternative inputs for embedded or route use (edit/create)
  areaId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  cragData: InputSignal<MinimalCrag | undefined> = input<
    MinimalCrag | undefined
  >(undefined);

  private readonly dialogAreaId = this._dialogCtx?.data?.areaId;
  private readonly dialogCragData = this._dialogCtx?.data?.cragData;

  private readonly effectiveAreaId: Signal<number | undefined> = computed(
    () => this.dialogAreaId ?? this.areaId(),
  );
  private readonly effectiveCragData: Signal<MinimalCrag | undefined> =
    computed(() => this.dialogCragData ?? this.cragData());

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveCragData());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  slug = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  latitude = new FormControl<number | null>(null, [
    Validators.min(-90),
    Validators.max(90),
  ]);
  longitude = new FormControl<number | null>(null, [
    Validators.min(-180),
    Validators.max(180),
  ]);
  approach = new FormControl<number | null>(null);
  description_es = new FormControl<string | null>(null);
  description_en = new FormControl<string | null>(null);
  warning_es = new FormControl<string | null>(null);
  warning_en = new FormControl<string | null>(null);
  eight_anu_sector_slugs = new FormControl<string[] | null>([]);

  private editingId: number | null = null;
  private editingAreaId: number | null = null;

  constructor() {
    // Prefill in edit mode
    effect(() => {
      const data = this.effectiveCragData();
      if (!data) return;
      this.editingId = data.id;
      this.editingAreaId = data.area_id;
      this.name.setValue(data.name ?? '');
      this.slug.setValue(data.slug ?? '');
      this.latitude.setValue(data.latitude ?? null);
      this.longitude.setValue(data.longitude ?? null);
      this.approach.setValue(data.approach ?? null);
      this.description_es.setValue(data.description_es ?? null);
      this.description_en.setValue(data.description_en ?? null);
      this.warning_es.setValue(data.warning_es ?? null);
      this.warning_en.setValue(data.warning_en ?? null);
      this.fetchFullCragData(data.id);
    });
  }

  private async fetchFullCragData(id: number) {
    const { data, error } = await this.crags.getById(id);
    if (data && !error) {
      this.eight_anu_sector_slugs.setValue(data.eight_anu_sector_slugs || []);
      this.name.markAsPristine();
    }
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    const name = this.name.value;
    const base = {
      name,
      slug: this.slug.value,
      latitude: this.latitude.value,
      longitude: this.longitude.value,
      approach: this.approach.value,
      description_es: this.description_es.value,
      description_en: this.description_en.value,
      warning_es: this.warning_es.value,
      warning_en: this.warning_en.value,
      eight_anu_sector_slugs: this.eight_anu_sector_slugs.value,
    };

    try {
      if (this.isEdit()) {
        if (this.editingId == null) return;
        await this.crags.update(this.editingId, base);
      } else {
        const area_id =
          this.effectiveAreaId() ?? this.editingAreaId ?? undefined;
        if (!area_id) return; // area required to create
        await this.crags.create({
          area_id,
          ...base,
          slug: slugify(name),
        });
      }
      if (this._dialogCtx) {
        this._dialogCtx.completeWith(
          this.isEdit() ? this.slug.value || true : true,
        );
      } else {
        this.goBack();
      }
    } catch (e) {
      const error = e as Error;
      console.error('[CragFormComponent] Error submitting crag:', error);
      handleErrorToast(error, this.toast);
    }
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  pickLocation(): void {
    this.mapService.pickLocationAndUpdate(this.latitude, this.longitude);
  }

  onPasteLocation(event: ClipboardEvent): void {
    this.mapService.handlePasteLocation(event, this.latitude, this.longitude);
  }
}
