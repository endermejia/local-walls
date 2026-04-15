import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  Signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { TuiIcon, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { filter, switchMap } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { WeatherService } from '../../services/weather.service';

@Component({
  selector: 'app-weather-forecast',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    @if (weather(); as days) {
      <div class="flex flex-col gap-4">
        <h3
          class="text-sm font-semibold flex items-center gap-2 opacity-70 uppercase tracking-wider"
        >
          <tui-icon icon="@tui.cloud-sun" class="size-4!" />
          {{ 'weather.title' | translate }}
        </h3>

        <!-- Days Selection -->
        <tui-scrollbar
          class="pb-2"
          (touchstart)="$event.stopPropagation()"
          (touchmove)="$event.stopPropagation()"
          (touchend)="$event.stopPropagation()"
        >
          <div class="flex gap-2 px-2 pb-4">
            @for (day of days; track day.date; let idx = $index) {
              <button
                type="button"
                (click)="selectedDayIdx.set(idx)"
                class="flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[70px] hover:bg-(--tui-background-neutral-1-hover) cursor-pointer"
                [class.bg-(--tui-background-neutral-1)]="
                  selectedDayIdx() === idx
                "
                [class.border-(--tui-border-normal-hover)]="
                  selectedDayIdx() === idx
                "
                [class.bg-(--tui-background-base)]="selectedDayIdx() !== idx"
                [class.border-(--tui-border-normal)]="selectedDayIdx() !== idx"
              >
                <span class="text-xs opacity-70 mb-1 capitalize">
                  {{
                    day.date
                      | date: 'EEE' : undefined : global.selectedLanguage()
                  }}
                </span>
                <tui-icon [icon]="day.icon" class="size-8! my-1" />
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
          <tui-scrollbar
            #hourlyScroll
            class="pb-2"
            (touchstart)="$event.stopPropagation()"
            (touchmove)="$event.stopPropagation()"
            (touchend)="$event.stopPropagation()"
          >
            <div class="flex gap-3 px-2 pb-4">
              @for (hour of selectedDay.hourly; track hour.time) {
                <div
                  #hourItem
                  class="flex flex-col items-center min-w-[50px] py-1 px-1 rounded-xl transition-colors border hour-item"
                  [class.bg-(--tui-background-neutral-1)]="
                    isCurrentHour(hour.time)
                  "
                  [class.border-(--tui-border-normal-hover)]="
                    isCurrentHour(hour.time)
                  "
                  [class.border-(--tui-border-normal)]="
                    !isCurrentHour(hour.time)
                  "
                >
                  <span class="text-[10px] opacity-60">
                    {{ hour.time | date: 'HH:mm' }}
                  </span>
                  <tui-icon [icon]="hour.icon" class="size-6! my-1" />
                  <span class="text-xs font-medium">
                    {{ hour.temp | number: '1.0-0' }}°
                  </span>
                  @if (hour.precipProb > 0) {
                    <span class="text-[9px] text-blue-500 font-bold mb-1">
                      {{ hour.precipProb }}%
                    </span>
                  } @else {
                    <span class="h-[14px] mb-1"></span>
                  }

                  <div
                    class="flex flex-col items-center gap-0.5 mt-auto"
                    [attr.aria-label]="
                      hour.windSpeed + ' km/h, ' + hour.windDir + '°'
                    "
                  >
                    <tui-icon
                      [icon]="hour.windDirIcon"
                      class="size-4! opacity-70"
                    />
                    <span class="text-[9px] opacity-70">
                      {{ hour.windSpeed | number: '1.0-0' }} km/h
                    </span>
                  </div>
                </div>
              }
            </div>
          </tui-scrollbar>
        }
      </div>
    } @else {
      <!-- Skeleton Loading State -->
      <tui-loader [loading]="true" [overlay]="true">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <div [tuiSkeleton]="true" class="w-4 h-4 rounded-full"></div>
            <div [tuiSkeleton]="true" class="w-32 h-4 rounded-full"></div>
          </div>

          <!-- Days Skeleton -->
          <div class="flex gap-2 px-2 pb-4 overflow-hidden">
            @for (i of [1, 2, 3, 4, 5, 6, 7]; track i) {
              <div
                class="flex flex-col items-center p-3 rounded-2xl border border-(--tui-border-normal) min-w-[70px] bg-(--tui-background-base)"
              >
                <div
                  [tuiSkeleton]="true"
                  class="w-8 h-2 rounded-full mb-1 opacity-70"
                ></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-8 h-8 rounded-full my-1"
                ></div>
                <div class="flex flex-col items-center gap-1">
                  <div [tuiSkeleton]="true" class="w-6 h-3 rounded-full"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-4 h-2 rounded-full opacity-60"
                  ></div>
                </div>
              </div>
            }
          </div>

          <!-- Hourly Skeleton -->
          <div class="flex gap-3 px-2 pb-4 overflow-hidden mt-2">
            @for (i of hoursSkeleton; track i) {
              <div class="flex flex-col items-center min-w-[45px] py-1 gap-1">
                <div
                  [tuiSkeleton]="true"
                  class="w-6 h-2 rounded-full opacity-60"
                ></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-6 h-6 rounded-full my-1"
                ></div>
                <div [tuiSkeleton]="true" class="w-4 h-3 rounded-full"></div>
                <div class="h-[14px] mb-1"></div>
                <div class="flex flex-col items-center gap-0.5 mt-auto">
                  <div
                    [tuiSkeleton]="true"
                    class="w-4 h-4 rounded-full opacity-70"
                  ></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-8 h-2 rounded-full opacity-70"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      </tui-loader>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherForecastComponent {
  private readonly weatherService = inject(WeatherService);
  protected readonly global = inject(GlobalData);
  protected readonly selectedDayIdx = signal(0);
  protected readonly hoursSkeleton = Array.from({ length: 24 }, (_, i) => i);

  protected readonly hourlyScroll: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('hourlyScroll', { read: ElementRef });
  private readonly hourItems =
    viewChildren<ElementRef<HTMLElement>>('hourItem');

  coords = input.required<{ lat: number; lng: number }>();

  readonly weather = toSignal(
    toObservable(this.coords).pipe(
      filter((c) => !!c.lat && !!c.lng),
      switchMap((c) => this.weatherService.getForecast(c.lat, c.lng)),
    ),
  );

  constructor() {
    effect(() => {
      this.weather();
      this.selectedDayIdx();

      untracked(() => {
        setTimeout(() => {
          const el = this.hourlyScroll()?.nativeElement;
          if (!el) return;

          const days = this.weather();
          const dayIdx = this.selectedDayIdx();
          const currentDay = days?.[dayIdx];
          if (!currentDay || !currentDay.hourly) return;

          const now = new Date();
          const currentIdx = currentDay.hourly.findIndex(
            (h) =>
              h.time.getHours() === now.getHours() &&
              h.time.getDate() === now.getDate(),
          );

          if (currentIdx !== -1) {
            const target = this.hourItems()[currentIdx]?.nativeElement;
            if (target) {
              const elRect = el.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              const scrollOffset =
                targetRect.left -
                elRect.left -
                elRect.width / 2 +
                targetRect.width / 2;
              el.scrollLeft += scrollOffset;
            }
          } else {
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
          }
        }, 0);
      });
    });
  }

  protected isCurrentHour(date: Date): boolean {
    const now = new Date();
    return (
      date.getHours() === now.getHours() &&
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
}
