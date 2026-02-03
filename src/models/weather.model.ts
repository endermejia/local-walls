export interface WeatherForecast {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
}

export interface WeatherDay {
  date: Date;
  code: number;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  icon: string;
  hourly?: WeatherHour[];
}

export interface WeatherHour {
  time: Date;
  temp: number;
  code: number;
  icon: string;
  precipProb: number;
}
