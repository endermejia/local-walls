import { Coordinates } from '../models/coordinates.model';

/**
 * Generates a Google Maps URL to display the location of a spot
 * @returns A Google Maps URL string that when opened will show the location
 * @param c
 */
export function mapLocationUrl({ lat, lng }: Coordinates): string {
  const q = `${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
