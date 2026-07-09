export const APP_NAME = 'ClimBeast';
export const APP_TITLE = `${APP_NAME} | fanatic community`;
export const BASE_URL = 'https://climbeast.com';
export const DEFAULT_IMAGE = `${BASE_URL}/logo/climbeast.png`;

export const INDOOR_ROUTE_COLORS: Record<string, string> = {
  '#EF4444': 'red',
  '#3B82F6': 'blue',
  '#F97316': 'orange',
  '#06B6D4': 'cyan',
  '#EAB308': 'yellow',
  '#22C55E': 'green',
  '#EC4899': 'pink',
  '#A855F7': 'purple',
  '#ffffff': 'white',
  '#000000': 'black',
  '#6B7280': 'grey',
  '#84CC16': 'lime',
  '#14B8A6': 'teal',
  '#6366F1': 'indigo',
  '#D946EF': 'magenta',
};

export const INDOOR_ROUTE_COLORS_LIST: readonly {
  value: string;
  name: string;
}[] = Object.entries(INDOOR_ROUTE_COLORS).map(([value, name]) => ({
  value,
  name,
}));
