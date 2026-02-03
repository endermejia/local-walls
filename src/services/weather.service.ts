import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { WeatherDay, WeatherForecast } from '../models';

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
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
    };

    return this.http.get<WeatherForecast>(this.apiUrl, { params }).pipe(
      map((response) => {
        return response.daily.time.map((time, index) => ({
          date: new Date(time),
          code: response.daily.weather_code[index],
          maxTemp: response.daily.temperature_2m_max[index],
          minTemp: response.daily.temperature_2m_min[index],
          precipitation: response.daily.precipitation_sum[index],
          icon: this.getWeatherIcon(response.daily.weather_code[index]),
        }));
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
