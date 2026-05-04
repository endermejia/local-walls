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

import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiInput,
  TuiTextfield,
  TuiNumberFormat,
} from '@taiga-ui/core';
import { TuiTextarea, TuiInputNumber } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';
import { GlobalData } from '../../services/global-data';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';
import { MapService } from '../../services/map.service';
import { handleErrorToast, slugify } from '../../utils';
import { IndoorCenterDto } from '../../models';

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
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield class="block">
        <label tuiLabel for="center-name">{{ 'name' | translate }}</label>
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
        <label tuiLabel for="center-city">{{ 'city' | translate }}</label>
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
          [disabled]="centerForm.name().invalid()"
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
export class IndoorCenterFormComponent {
  private readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly supabase = inject(SupabaseService);
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

  model = signal<{
    name: string;
    slug: string;
    city: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
  }>({
    name: '',
    slug: '',
    city: '',
    description: '',
    latitude: null,
    longitude: null,
  });

  centerForm = form(this.model, (path) => {
    required(path.name);
  });

  private editingId: string | null = null;

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
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      }));
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

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.centerForm, async () => {
      const model = this.model();
      const payload: Omit<IndoorCenterDto, 'id' | 'created_at'> = {
        name: model.name,
        slug: model.slug,
        city: model.city || null,
        description: model.description || null,
        avatar_url: this.effectiveCenterData()?.avatar_url ?? null,
        latitude: model.latitude,
        longitude: model.longitude,
        contact_info: this.effectiveCenterData()?.contact_info ?? null,
        country: this.effectiveCenterData()?.country ?? null,
        gallery_urls: this.effectiveCenterData()?.gallery_urls ?? null,
        schedule: this.effectiveCenterData()?.schedule ?? null,
        location: this.effectiveCenterData()?.location ?? null,
      };

      try {
        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.indoor.updateCenter(this.editingId, payload);
        } else {
          await this.indoor.createCenter(payload);
        }
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(true);
        } else {
          this.goBack();
        }
      } catch (e) {
        const error = e as Error;
        console.error('[IndoorCenterFormComponent] Error submitting:', e);
        handleErrorToast(error, this.toast);
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

  onLatChange(value: number | null): void {
    this.model.update((m) => ({ ...m, latitude: value }));
  }

  onLngChange(value: number | null): void {
    this.model.update((m) => ({ ...m, longitude: value }));
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
