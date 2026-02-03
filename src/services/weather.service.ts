import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { WeatherDay, WeatherForecast, WeatherHour } from '../models';

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://api.open-meteo.com/v1/forecast';

  getForecast(lat: number, lng: number): Observable<WeatherDay[]> {
    const params = {
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      timezone: 'auto',
      forecast_days: '7',
    };

    return this.http.get<WeatherForecast>(this.apiUrl, { params }).pipe(
      map((response) => {
        return response.daily.time.map((time, index) => {
          const date = new Date(time);
          const dailyCode = response.daily.weather_code[index];

          // Filter hourly data for this day
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          const dayHours: WeatherHour[] = [];
          response.hourly.time.forEach((hTime, hIdx) => {
            const hDate = new Date(hTime);
            if (hDate >= dayStart && hDate <= dayEnd) {
              dayHours.push({
                time: hDate,
                temp: response.hourly.temperature_2m[hIdx],
                code: response.hourly.weather_code[hIdx],
                icon: this.getWeatherIcon(response.hourly.weather_code[hIdx]),
                precipProb: response.hourly.precipitation_probability[hIdx],
              });
            }
          });

          return {
            date,
            code: dailyCode,
            maxTemp: response.daily.temperature_2m_max[index],
            minTemp: response.daily.temperature_2m_min[index],
            precipitation: response.daily.precipitation_sum[index],
            icon: this.getWeatherIcon(dailyCode),
            hourly: dayHours,
          };
        });
      }),
    );
  }

  private getWeatherIcon(code: number): string {
    if (code === 0) return '@tui.sun';
    if (code <= 3) return '@tui.cloud-sun';
    if (code <= 48) return '@tui.cloud-fog';
    if (code <= 57) return '@tui.cloud-drizzle';
    if (code <= 67) return '@tui.cloud-rain';
    if (code <= 77) return '@tui.cloud-snow';
    if (code <= 82) return '@tui.cloud-rain';
    if (code <= 86) return '@tui.cloud-snow';
    if (code <= 99) return '@tui.cloud-lightning';
    return '@tui.sun';
  }
}
