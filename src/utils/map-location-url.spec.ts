import { mapLocationUrl } from './map-location-url';

describe('mapLocationUrl', () => {
  it('should generate a correct Google Maps URL for positive coordinates', () => {
    const coordinates = { latitude: 48.8588443, longitude: 2.2943506 }; // Eiffel Tower
    const result = mapLocationUrl(coordinates);
    expect(result).toBe('https://www.google.com/maps/search/?api=1&query=48.8588443,2.2943506');
  });

  it('should generate a correct Google Maps URL for negative coordinates', () => {
    const coordinates = { latitude: -33.8567844, longitude: -151.2152967 }; // Near Sydney Opera House
    const result = mapLocationUrl(coordinates);
    expect(result).toBe('https://www.google.com/maps/search/?api=1&query=-33.8567844,-151.2152967');
  });

  it('should generate a correct Google Maps URL for mixed positive and negative coordinates', () => {
    const coordinates = { latitude: -22.951916, longitude: -43.2104872 }; // Christ the Redeemer
    const result = mapLocationUrl(coordinates);
    expect(result).toBe('https://www.google.com/maps/search/?api=1&query=-22.951916,-43.2104872');
  });

  it('should generate a correct Google Maps URL for zero coordinates', () => {
    const coordinates = { latitude: 0, longitude: 0 };
    const result = mapLocationUrl(coordinates);
    expect(result).toBe('https://www.google.com/maps/search/?api=1&query=0,0');
  });
});
