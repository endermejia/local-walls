import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { TuiIcon, TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';

import { GlobalData, WeatherService } from '../services';

@Component({
  selector: 'app-weather-forecast',
  standalone: true,
  imports: [
    CommonModule,
    TuiIcon,
    TuiScrollbar,
    TranslatePipe,
    DatePipe,
    DecimalPipe,
  ],
  template: `
    @if (weather(); as days) {
      <div class="flex flex-col gap-4">
        <h3
          class="text-sm font-semibold flex items-center gap-2 opacity-70 uppercase tracking-wider"
        >
          <tui-icon icon="@tui.cloud-sun" class="!size-4" />
          {{ 'weather.title' | translate }}
        </h3>

        <!-- Days Selection -->
        <tui-scrollbar class="pb-2">
          <div class="flex gap-2">
            @for (day of days; track day.date; let idx = $index) {
              <button
                type="button"
                (click)="selectedDayIdx.set(idx)"
                class="flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[70px]"
                [class.bg-[var(--tui-background-neutral-1)]]="
                  selectedDayIdx() === idx
                "
                [class.border-primary]="selectedDayIdx() === idx"
                [class.bg-[var(--tui-background-base)]]="
                  selectedDayIdx() !== idx
                "
                [class.border-[var(--tui-border-normal)]]="
                  selectedDayIdx() !== idx
                "
              >
                <span class="text-xs opacity-70 mb-1 capitalize">
                  {{
                    day.date
                      | date: 'EEE' : undefined : global.selectedLanguage()
                  }}
                </span>
                <tui-icon [icon]="day.icon" class="!size-8 my-1" />
                <div class="flex flex-col items-center">
                  <span class="font-bold">
                    {{ day.maxTemp | number: '1.0-0' }}°
                  </span>
                  <span class="text-xs opacity-60">
                    {{ day.minTemp | number: '1.0-0' }}°
                  </span>
                </div>
              </button>
            }
          </div>
        </tui-scrollbar>

        <!-- Hourly Forecast for Selected Day -->
        @if (days[selectedDayIdx()]; as selectedDay) {
          <tui-scrollbar class="pb-2">
            <div class="flex gap-4">
              @for (hour of selectedDay.hourly; track hour.time) {
                <div class="flex flex-col items-center min-w-[45px] py-1">
                  <span class="text-[10px] opacity-60">
                    {{ hour.time | date: 'HH:mm' }}
                  </span>
                  <tui-icon [icon]="hour.icon" class="!size-6 my-1" />
                  <span class="text-xs font-medium">
                    {{ hour.temp | number: '1.0-0' }}°
                  </span>
                  @if (hour.precipProb > 0) {
                    <span class="text-[9px] text-blue-500 font-bold">
                      {{ hour.precipProb }}%
                    </span>
                  }
                </div>
              }
            </div>
          </tui-scrollbar>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherForecastComponent {
  private readonly weatherService = inject(WeatherService);
  protected readonly global = inject(GlobalData);
  protected readonly selectedDayIdx = signal(0);

  coords = input.required<{ lat: number; lng: number }>();

  readonly weather = toSignal(
    toObservable(this.coords).pipe(
      filter((c) => !!c.lat && !!c.lng),
      switchMap((c) => this.weatherService.getForecast(c.lat, c.lng)),
    ),
  );
}
