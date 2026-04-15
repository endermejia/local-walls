import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';

import { ParkingsService } from '../../services/parkings.service';
import { AppCardComponent } from '../ui/card';

@Component({
  selector: 'app-parking-card',
  imports: [AppCardComponent, TuiIcon, TuiCopy, TuiButton],
  template: `
    <app-card [appearance]="appearance()">
      <ng-container title>
        <span
          class="font-bold! truncate block text-2xl! text-(--tui-text-primary)!"
        >
          {{ parking().name }}
        </span>
      </ng-container>

      <div extra class="flex items-center gap-2">
        @let size = parking().size ?? parking().capacity;
        @if (size !== undefined && size !== null) {
          <div class="flex items-center gap-1 opacity-60">
            <tui-icon icon="@tui.car" />
            <span class="text-lg">x {{ size }}</span>
          </div>
        }
        <ng-content select="[extra]" />
      </div>

      <ng-container titleActions>
        <ng-content select="[titleActions]" />
      </ng-container>

      <div content class="flex flex-col gap-2 grow justify-center">
        @if (parking().description; as desc) {
          <p class="line-clamp-2 text-sm italic opacity-70">"{{ desc }}"</p>
        }
        <div class="flex items-center gap-1">
          <tui-icon
            icon="@tui.map-pin"
            class="opacity-70"
            [style.font-size.rem]="0.8"
          />
          <tui-copy class="opacity-70 text-sm">
            {{ coords() }}
          </tui-copy>
          @if (canShare()) {
            <button
              tuiIconButton
              appearance="flat"
              size="xs"
              iconStart="@tui.share-2"
              class="opacity-70 hover:opacity-100"
              (click)="share()"
            ></button>
          }
        </div>

        <div class="flex gap-2 mt-1 empty:hidden">
          <ng-content select="[actions]" />
        </div>
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingCardComponent {
  protected readonly parkingsService = inject(ParkingsService);

  parking = input.required<any>();
  appearance = input<string>('outline');

  protected readonly coords = computed(() => {
    const p = this.parking();
    const lat = p.lat || p.latitude;
    const lng = p.lng || p.longitude;
    return `${lat}, ${lng}`;
  });

  protected readonly canShare = computed(() => !!navigator.share);

  protected async share() {
    const coords = this.coords();
    const name = this.parking().name;
    const url = `https://www.google.com/maps/search/?api=1&query=${coords}`;

    try {
      await navigator.share({
        title: name,
        text: `Parking: ${name}\nCoordenadas: ${coords}`,
        url: url,
      });
    } catch (err) {
      // Ignore abort errors
    }
  }
}
