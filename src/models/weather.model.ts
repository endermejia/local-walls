export interface WeatherForecast {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

export interface WeatherDay {
  date: Date;
  code: number;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  icon: string;
}
