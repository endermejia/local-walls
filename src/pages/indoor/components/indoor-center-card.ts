import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon } from '@taiga-ui/core';

import { MapIndoorCenterItem } from '../../../models/map.model';
import { mapLocationUrl } from '../../../utils';

@Component({
  selector: 'app-indoor-center-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TuiIcon, NgClass],
  template: `
    @if (item()) {
      @let it = item()!;
      <div
        class="flex flex-col gap-4 p-4 rounded-3xl bg-(--tui-background-elevation-1) border border-(--tui-border-normal)"
      >
        <div class="flex items-center gap-4">
          @if (it.avatar_url) {
            <img
              [src]="it.avatar_url"
              alt="Avatar"
              class="w-16 h-16 rounded-2xl object-cover shrink-0"
            />
          } @else {
            <div class="w-16 h-16 rounded-2xl bg-(--tui-background-elevation-2) flex items-center justify-center shrink-0">
              <tui-icon icon="@tui.home" class="text-2xl text-(--tui-text-tertiary)" />
            </div>
          }

          <div class="flex flex-col flex-1 min-w-0">
            <h3 class="text-lg font-bold truncate leading-tight mb-1">{{ it.name }}</h3>
            @if (it.city || it.country) {
              <div class="flex items-center gap-1 text-sm text-(--tui-text-secondary)">
                <tui-icon icon="@tui.map-pin" class="text-sm" />
                <span class="truncate">{{ it.city }}{{ it.city && it.country ? ', ' : '' }}{{ it.country }}</span>
              </div>
            }
          </div>
        </div>

        @if (it.description) {
          <p class="text-sm text-(--tui-text-secondary) line-clamp-2">
            {{ it.description }}
          </p>
        }

        <div class="flex items-center gap-2 mt-1">
          <a
            [routerLink]="['/indoor', it.slug]"
            class="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors text-sm"
          >
            {{ 'viewCenter' | translate }}
          </a>
          <a
            [href]="mapLocationUrl({ latitude: it.latitude, longitude: it.longitude })"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center p-3 bg-(--tui-background-elevation-2) hover:bg-(--tui-background-elevation-3) text-(--tui-text-primary) rounded-2xl transition-colors"
          >
            <tui-icon icon="@tui.map" class="text-xl" />
          </a>
        </div>
      </div>
    }
  `,
})
export class IndoorCenterCardComponent {
  item = input<MapIndoorCenterItem | null>(null);

  protected readonly mapLocationUrl = mapLocationUrl;
}
