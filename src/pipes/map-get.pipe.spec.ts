import { MapGetPipe } from './map-get.pipe';

describe('MapGetPipe', () => {
  let pipe: MapGetPipe;

  beforeEach(() => {
    pipe = new MapGetPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the value when the key exists in the map', () => {
    const map = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    expect(pipe.transform('a', map)).toBe(1);
    expect(pipe.transform('b', map)).toBe(2);
  });

  it('should return undefined when the key does not exist in the map', () => {
    const map = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    expect(pipe.transform('c', map)).toBeUndefined();
  });

  it('should return undefined when the map is undefined', () => {
    expect(pipe.transform('a', undefined)).toBeUndefined();
  });

  it('should return undefined when the map is null', () => {
    expect(pipe.transform('a', null)).toBeUndefined();
  });
});
