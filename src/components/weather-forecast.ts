import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { TuiIcon, TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';

import { GlobalData, WeatherService } from '../services';

@Component({
  selector: 'app-weather-forecast',
  standalone: true,
  imports: [CommonModule, TuiIcon, TuiScrollbar, TranslatePipe],
  template: `
    @if (weather(); as days) {
      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold flex items-center gap-2 opacity-70 uppercase tracking-wider">
          <tui-icon icon="@tui.cloud-sun" class="!size-4" />
          {{ 'weather.title' | translate }}
        </h3>
        <tui-scrollbar class="pb-2">
          <div class="flex gap-2 overflow-x-auto pb-2">
            @for (day of days; track day.date) {
              <div
                class="flex flex-col items-center p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 min-w-[70px]"
              >
                <span class="text-xs opacity-70 mb-1 capitalize">
                  {{ day.date | date: 'EEE' : undefined : global.selectedLanguage() }}
                </span>
                <tui-icon [icon]="day.icon" class="!size-8 my-1" />
                <div class="flex flex-col items-center">
                  <span class="font-bold">{{ day.maxTemp | number: '1.0-0' }}°</span>
                  <span class="text-xs opacity-60">{{ day.minTemp | number: '1.0-0' }}°</span>
                </div>
              </div>
            }
          </div>
        </tui-scrollbar>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherForecastComponent {
  private readonly weatherService = inject(WeatherService);
  protected readonly global = inject(GlobalData);

  coords = input.required<{ lat: number; lng: number }>();

  readonly weather = toSignal(
    toObservable(this.coords).pipe(
      filter((c) => !!c.lat && !!c.lng),
      switchMap((c) => this.weatherService.getForecast(c.lat, c.lng)),
    ),
  );
}
