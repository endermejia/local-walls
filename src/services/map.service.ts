import { firstValueFrom, Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { LocationPickerComponent } from '../components';

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly dialogs = inject(TuiDialogService);

  pickLocation(
    lat?: number | null,
    lng?: number | null,
  ): Observable<{ lat: number; lng: number } | null> {
    return this.dialogs.open<{ lat: number; lng: number } | null>(
      new PolymorpheusComponent(LocationPickerComponent),
      {
        closable: false,
        data: {
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        },
        appearance: 'fullscreen',
      },
    );
  }

  pickLocationAndUpdate(
    latCtrl: FormControl<number | null>,
    lngCtrl: FormControl<number | null>,
  ): void {
    void firstValueFrom(this.pickLocation(latCtrl.value, lngCtrl.value)).then(
      (result) => {
        if (result) {
          latCtrl.setValue(result.lat);
          lngCtrl.setValue(result.lng);
          latCtrl.markAsDirty();
          lngCtrl.markAsDirty();
        }
      },
    );
  }

  parseCoordinates(text: string): { lat: number; lng: number } | null {
    // Regex to find two numbers separated by comma and/or space
    const match = text.match(/(-?\d+\.?\d*)\s*[\s,]\s*(-?\d+\.?\d*)/);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
        };
      }
    }
    return null;
  }

  handlePasteLocation(
    event: ClipboardEvent,
    latCtrl: FormControl<number | null>,
    lngCtrl: FormControl<number | null>,
  ): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const coords = this.parseCoordinates(text);
    if (coords) {
      event.preventDefault();
      latCtrl.setValue(coords.lat);
      lngCtrl.setValue(coords.lng);
      latCtrl.markAsDirty();
      lngCtrl.markAsDirty();
    }
  }

  sanitizeCoordinates(
    latCtrl: FormControl<number | null>,
    lngCtrl: FormControl<number | null>,
  ): void {
    if (latCtrl.value != null) {
      latCtrl.setValue(parseFloat(latCtrl.value.toFixed(6)), {
        emitEvent: false,
      });
    }
    if (lngCtrl.value != null) {
      lngCtrl.setValue(parseFloat(lngCtrl.value.toFixed(6)), {
        emitEvent: false,
      });
    }
  }
}
