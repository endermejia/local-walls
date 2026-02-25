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
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, required, min, max } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';

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

interface CragFormModel {
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  approach: number | null;
  description_es: string | null;
  description_en: string | null;
  warning_es: string | null;
  warning_en: string | null;
  eight_anu_sector_slugs: string[] | null;
}

@Component({
  selector: 'app-crag-form',
  imports: [
    CommonModule,
    FormField,
    FormsModule,
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
          [formField]="cragForm.name"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>
      @if (cragForm.name().invalid() && cragForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      @if (isEdit()) {
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="crag-slug">{{ 'slug' | translate }}</label>
          <input
            tuiTextfield
            id="crag-slug"
            [formField]="cragForm.slug"
            type="text"
            autocomplete="off"
          />
        </tui-textfield>
        @if (cragForm.slug().invalid() && cragForm.slug().touched()) {
          <tui-error [error]="'errors.required' | translate" />
        }
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
        <app-counter
          [ngModel]="model().approach"
          (ngModelChange)="onApproachChange($event)"
          name="approach"
          label="approach"
          suffix="min."
        />
      </div>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-es">{{ 'description_es' | translate }}</label>
        <textarea
          tuiTextarea
          id="desc-es"
          [formField]="$any(cragForm.description_es)"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-en">{{ 'description_en' | translate }}</label>
        <textarea
          tuiTextarea
          id="desc-en"
          [formField]="$any(cragForm.description_en)"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-es">{{ 'warning_es' | translate }}</label>
        <textarea
          tuiTextarea
          id="warn-es"
          [formField]="$any(cragForm.warning_es)"
          rows="3"
        ></textarea>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-en">{{ 'warning_en' | translate }}</label>
        <textarea
          tuiTextarea
          id="warn-en"
          [formField]="$any(cragForm.warning_en)"
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
            [ngModel]="model().eight_anu_sector_slugs"
            (ngModelChange)="onSlugsChange($event)"
            name="eight_anu_sector_slugs"
            autocomplete="off"
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
            cragForm.name().invalid() ||
            (isEdit() && cragForm.slug().invalid()) ||
            (!cragForm.name().dirty() && !isEdit())
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

  model = signal<CragFormModel>({
    name: '',
    slug: '',
    latitude: null,
    longitude: null,
    approach: null,
    description_es: null,
    description_en: null,
    warning_es: null,
    warning_en: null,
    eight_anu_sector_slugs: [],
  });

  cragForm = form(this.model, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.slug, {
      when: () => this.isEdit(),
    });
    min(schemaPath.latitude, -90);
    max(schemaPath.latitude, 90);
    min(schemaPath.longitude, -180);
    max(schemaPath.longitude, 180);
    min(schemaPath.approach, 0);
  });

  private editingId: number | null = null;
  private editingAreaId: number | null = null;

  constructor() {
    // Prefill in edit mode
    effect(() => {
      const data = this.effectiveCragData();
      if (!data) return;
      this.editingId = data.id;
      this.editingAreaId = data.area_id;

      const currentSlugs = untracked(() => this.model().eight_anu_sector_slugs);

      this.model.set({
        name: data.name ?? '',
        slug: data.slug ?? '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        approach: data.approach ?? null,
        description_es: data.description_es ?? null,
        description_en: data.description_en ?? null,
        warning_es: data.warning_es ?? null,
        warning_en: data.warning_en ?? null,
        eight_anu_sector_slugs: currentSlugs, // Preserve array from fetch
      });

      this.fetchFullCragData(data.id);
    });
  }

  private async fetchFullCragData(id: number) {
    const { data, error } = await this.crags.getById(id);
    if (data && !error) {
      this.model.update((m) => ({
        ...m,
        eight_anu_sector_slugs: data.eight_anu_sector_slugs || [],
      }));
      // Note: Signal forms don't have a direct equivalent to markAsPristine yet natively in simple setup,
      // but it handles initial vs dirty state well.
    }
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.cragForm.name().invalid()) {
      return;
    }

    const value = this.model();
    const name = value.name;
    const base = {
      name,
      slug: value.slug,
      latitude: value.latitude,
      longitude: value.longitude,
      approach: value.approach,
      description_es: value.description_es,
      description_en: value.description_en,
      warning_es: value.warning_es,
      warning_en: value.warning_en,
      eight_anu_sector_slugs: value.eight_anu_sector_slugs,
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
        this._dialogCtx.completeWith(this.isEdit() ? value.slug || true : true);
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

  onSlugsChange(slugs: string[] | null): void {
    this.model.update((m) => ({ ...m, eight_anu_sector_slugs: slugs }));
  }

  onLatChange(value: number | null): void {
    this.model.update((m) => ({ ...m, latitude: value }));
  }

  onLngChange(value: number | null): void {
    this.model.update((m) => ({ ...m, longitude: value }));
  }

  onApproachChange(value: number | null): void {
    this.model.update((m) => ({ ...m, approach: value }));
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
      this.cragForm.latitude().value.set(result.lat);
      this.cragForm.longitude().value.set(result.lng);
      // Wait, we can't directly mutate model.update if we want field to be dirty?
      // Actually signal forms uses value.set to also mark dirty usually! But wait...
      // Field level value set might not exist like that. If we update model, form fields get updated.
      // Let's just update model.
      this.model.update((m) => ({
        ...m,
        latitude: result.lat,
        longitude: result.lng,
      }));
    }
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
