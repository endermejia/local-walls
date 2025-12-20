import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { MapComponent } from './map';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [MapComponent, TuiButton, TranslatePipe],
  template: `
    <div class="flex flex-col h-full w-full relative">
      <app-map
        class="grow w-full h-full"
        [selection]="selection()"
        (mapClick)="onMapClick($event)"
      />

      <!-- Overlay Controls -->
      <div
        class="absolute bg-white p-4 bottom-0 left-0 right-0 z-[1000] flex justify-center gap-4 pointer-events-none"
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
    this.context.data?.lat && this.context.data?.lng
      ? { lat: this.context.data.lat, lng: this.context.data.lng }
      : null,
  );

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
