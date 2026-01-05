import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { LocationPickerComponent } from '../components/location-picker';
import { Observable } from 'rxjs';

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
        size: 'l',
        data: {
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        },
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
        return { lat, lng };
      }
    }
    return null;
  }
}
