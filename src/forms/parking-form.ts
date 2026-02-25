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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  form,
  FormField,
  max,
  min,
  required,
  submit,
} from '@angular/forms/signals';

import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiNumberFormat,
  TuiTextfield,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { TuiInputNumber } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { MapService } from '../services/map.service';
import { ParkingsService } from '../services/parkings.service';
import { ToastService } from '../services/toast.service';

import { CounterComponent } from '../components/counter';

import { ParkingDto } from '../models';

import { handleErrorToast } from '../utils';

interface MinimalParking {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  size: number;
}

@Component({
  selector: 'app-parking-form',
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
    TuiNumberFormat,
    CounterComponent,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="parking-name">{{ 'name' | translate }}</label>
        <input
          tuiTextfield
          id="parking-name"
          [formField]="parkingForm.name"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>
      @if (parkingForm.name().invalid() && parkingForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div class="grid grid-cols-2 gap-4">
          <tui-textfield [tuiTextfieldCleaner]="false">
            <label tuiLabel for="lat">{{ 'lat' | translate }}</label>
            <input
              tuiInputNumber
              id="lat"
              [formField]="$any(parkingForm.latitude)"
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
              [formField]="$any(parkingForm.longitude)"
              (change.zoneless)="sanitizeCoordinates()"
              autocomplete="off"
            />
          </tui-textfield>
        </div>

        <app-counter [formField]="$any(parkingForm.size)" label="capacity" />
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
          [disabled]="
            parkingForm.name().invalid() ||
            parkingForm.latitude().invalid() ||
            parkingForm.longitude().invalid() ||
            (!parkingForm.name().dirty() &&
              !parkingForm.latitude().dirty() &&
              !parkingForm.longitude().dirty() &&
              !parkingForm.size().dirty() &&
              !isEdit())
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
  host: { class: 'flex grow min-h-0' },
})
export class ParkingFormComponent {
  protected readonly mapService = inject(MapService);
  private readonly parkings = inject(ParkingsService);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly _dialogCtx: TuiDialogContext<
    ParkingDto | boolean | null,
    {
      cragId?: number;
      parkingData?: MinimalParking;
      defaultLocation?: { lat: number; lng: number };
    }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          ParkingDto | boolean | null,
          {
            cragId?: number;
            parkingData?: MinimalParking;
            defaultLocation?: { lat: number; lng: number };
          }
        >
      >();
    } catch {
      return null;
    }
  })();

  // Alternative inputs for embedded use
  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  parkingData: InputSignal<MinimalParking | undefined> = input<
    MinimalParking | undefined
  >(undefined);
  defaultLocation: InputSignal<{ lat: number; lng: number } | undefined> =
    input<{ lat: number; lng: number } | undefined>(undefined);

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogParkingData = this._dialogCtx?.data?.parkingData;
  private readonly dialogDefaultLocation =
    this._dialogCtx?.data?.defaultLocation;

  private readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  private readonly effectiveParkingData: Signal<MinimalParking | undefined> =
    computed(() => this.dialogParkingData ?? this.parkingData());
  private readonly effectiveDefaultLocation: Signal<
    { lat: number; lng: number } | undefined
  > = computed(() => this.dialogDefaultLocation ?? this.defaultLocation());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveParkingData(),
  );

  model = signal<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    size: number;
  }>({
    name: '',
    latitude: null,
    longitude: null,
    size: 0,
  });

  parkingForm = form(this.model, (path) => {
    required(path.name);
    required(path.latitude);
    min(path.latitude, -90);
    max(path.latitude, 90);
    required(path.longitude);
    min(path.longitude, -180);
    max(path.longitude, 180);
    min(path.size, 0);
  });

  private editingId: number | null = null;

  constructor() {
    effect(() => {
      const data = this.effectiveParkingData();
      if (data) {
        this.editingId = data.id;
        this.model.set({
          name: data.name ?? '',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          size: data.size ?? 0,
        });
      } else {
        const def = this.effectiveDefaultLocation();
        if (def) {
          this.model.update((m) => ({
            ...m,
            latitude: def.lat,
            longitude: def.lng,
          }));
        }
      }
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.parkingForm, async () => {
      const { name, latitude, longitude, size } = this.model();
      const payload = {
        name,
        latitude: latitude!,
        longitude: longitude!,
        size,
      };

      try {
        let result: ParkingDto | null;
        if (this.isEdit() && this.editingId != null) {
          result = await this.parkings.update(this.editingId, payload);
        } else {
          result = await this.parkings.create(payload);
          const cragId = this.effectiveCragId();
          if (result && cragId) {
            await this.parkings.addParkingToCrag(cragId, result.id);
          }
        }

        if (this._dialogCtx) {
          this._dialogCtx.completeWith(result || true);
        } else {
          this.goBack();
        }
      } catch (e) {
        const error = e as Error;
        console.error(
          '[ParkingFormComponent] Error submitting parking:',
          error,
        );
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

export default ParkingFormComponent;
