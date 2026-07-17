import { inject, Injectable, WritableSignal } from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';

import { firstValueFrom, Observable } from 'rxjs';

import { LocationPickerComponent } from '../components/location/location-picker';

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
        dismissible: false,
      },
    );
  }

  pickLocationAndUpdate(
    latCtrl: WritableSignal<number | null>,
    lngCtrl: WritableSignal<number | null>,
  ): void {
    void firstValueFrom(this.pickLocation(latCtrl(), lngCtrl())).then(
      (result) => {
        if (result) {
          latCtrl.set(result.lat);
          lngCtrl.set(result.lng);
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
    latCtrl: WritableSignal<number | null>,
    lngCtrl: WritableSignal<number | null>,
  ): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const coords = this.parseCoordinates(text);
    if (coords) {
      event.preventDefault();
      latCtrl.set(coords.lat);
      lngCtrl.set(coords.lng);
    }
  }

  sanitizeCoordinates(
    latCtrl: WritableSignal<number | null>,
    lngCtrl: WritableSignal<number | null>,
  ): void {
    if (latCtrl() != null) {
      latCtrl.set(parseFloat(latCtrl()!.toFixed(6)));
    }
    if (lngCtrl() != null) {
      lngCtrl.set(parseFloat(lngCtrl()!.toFixed(6)));
    }
  }
}
