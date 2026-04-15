import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';

import { ParkingsService } from '../../services/parkings.service';
import { AppCardComponent } from '../ui/card';
import { ParkingDto } from '../../models';

@Component({
  selector: 'app-parking-card',
  imports: [AppCardComponent, TranslatePipe, TuiButton, TuiCopy, TuiIcon],
  template: `
    @let item = parking();
    <app-card [appearance]="appearance()">
      <ng-container title>
        <span
          class="font-bold! block text-2xl! text-(--tui-text-primary)! whitespace-normal!"
        >
          {{ item.name }}
        </span>
      </ng-container>

      <div extra class="flex items-center gap-2">
        @let size = item.size;
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
              [title]="'share' | translate"
              (click)="share()"
            >
              {{ 'share' | translate }}
            </button>
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

  parking = input.required<ParkingDto>();
  appearance = input<string>('outline');

  protected readonly coords = computed(() => {
    const p = this.parking();
    return `${p.latitude}, ${p.longitude}`;
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
    } catch (_err) {
      // Ignore abort errors
    }
  }
}
