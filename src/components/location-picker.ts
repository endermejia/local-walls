import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
} from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { MapComponent } from './map';
import { TranslatePipe } from '@ngx-translate/core';
import { type MapOptions } from '../models';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [MapComponent, TuiButton, TranslatePipe],
  template: `
    <div class="flex flex-col h-full w-full relative">
      <app-map
        class="grow w-full h-full"
        [selection]="selection()"
        [options]="mapOptions()"
        (mapClick)="onMapClick($event)"
      />

      <!-- Overlay Controls -->
      <div
        class="absolute p-4 bottom-0 left-0 right-0 z-[1000] flex justify-center gap-4 pointer-events-none"
      >
        <button
          tuiButton
          appearance="secondary"
          size="m"
          class="pointer-events-auto"
          (click.zoneless)="cancel()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary"
          size="m"
          class="pointer-events-auto"
          [disabled]="!selection()"
          (click.zoneless)="confirm()"
        >
          {{ 'actions.select' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerComponent {
  private readonly context =
    injectContext<
      TuiDialogContext<
        { lat: number; lng: number } | null,
        { lat?: number; lng?: number }
      >
    >();

  protected readonly selection = signal<{ lat: number; lng: number } | null>(
    this.context.data?.lat != null && this.context.data?.lng != null
      ? { lat: this.context.data.lat, lng: this.context.data.lng }
      : null,
  );

  protected readonly mapOptions = computed<MapOptions>(() => {
    const data = this.context.data;
    if (data?.lat != null && data?.lng != null) {
      return {
        center: [data.lat, data.lng],
        zoom: 16,
        ignoreSavedViewport: true,
      };
    }
    return {
      center: [38.5, -0.6],
      zoom: 10,
      ignoreSavedViewport: true,
    };
  });

  protected onMapClick(coords: { lat: number; lng: number }): void {
    this.selection.set(coords);
  }

  protected confirm(): void {
    this.context.completeWith(this.selection());
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
