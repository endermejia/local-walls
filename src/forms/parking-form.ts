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
    ReactiveFormsModule,
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
          [formControl]="name"
          type="text"
          required
          [invalid]="name.invalid && name.touched"
        />
        @if (name.invalid && name.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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

        <app-counter [formControl]="size" label="capacity" [min]="0" />
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
            name.invalid ||
            latitude.invalid ||
            longitude.invalid ||
            (!name.dirty &&
              !latitude.dirty &&
              !longitude.dirty &&
              !size.dirty &&
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

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  latitude = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(-90),
    Validators.max(90),
  ]);
  longitude = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(-180),
    Validators.max(180),
  ]);
  size = new FormControl<number>(0, { nonNullable: true });

  private editingId: number | null = null;

  constructor() {
    effect(() => {
      const data = this.effectiveParkingData();
      if (data) {
        this.editingId = data.id;
        this.name.setValue(data.name ?? '');
        this.latitude.setValue(data.latitude ?? null);
        this.longitude.setValue(data.longitude ?? null);
        this.size.setValue(data.size ?? 0);
      } else {
        const def = this.effectiveDefaultLocation();
        if (def) {
          this.latitude.setValue(def.lat);
          this.longitude.setValue(def.lng);
        }
      }
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.name.invalid || this.latitude.invalid || this.longitude.invalid) {
      this.name.markAsTouched();
      this.latitude.markAsTouched();
      this.longitude.markAsTouched();
      return;
    }

    const payload = {
      name: this.name.value,
      latitude: this.latitude.value!,
      longitude: this.longitude.value!,
      size: this.size.value,
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
      console.error('[ParkingFormComponent] Error submitting parking:', error);
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

export default ParkingFormComponent;
