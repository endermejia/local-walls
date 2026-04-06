import { TopoHasPathPipe, TopoPathPointsPipe } from './topo-path.pipe';
import * as topoStylesUtils from '../utils/topo-styles.utils';

describe('TopoPathPointsPipe', () => {
  let pipe: TopoPathPointsPipe;

  beforeEach(() => {
    pipe = new TopoPathPointsPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty array for undefined path', () => {
    expect(pipe.transform(undefined)).toEqual([]);
  });

  it('should return an empty array for empty string', () => {
    expect(pipe.transform('')).toEqual([]);
    expect(pipe.transform('   ')).toEqual([]);
  });

  it('should correctly parse a single point', () => {
    expect(pipe.transform('10.5,20.2')).toEqual([{ x: 10.5, y: 20.2 }]);
  });

  it('should correctly parse multiple points separated by spaces', () => {
    expect(pipe.transform('10,20 30,40 50,60')).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]);
  });

  it('should handle extra whitespace between points', () => {
    expect(pipe.transform('  10,20   30,40  ')).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it('should ignore invalid points', () => {
    expect(pipe.transform('10,20 invalid 30,40')).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it('should ignore points with missing coordinates', () => {
    expect(pipe.transform('10,20 30, 40')).toEqual([
      { x: 10, y: 20 },
    ]);
  });
});

describe('TopoHasPathPipe', () => {
  let pipe: TopoHasPathPipe;

  beforeEach(() => {
    pipe = new TopoHasPathPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return true when a path exists and has points', () => {
    const map = new Map<number, { points: { x: number; y: number }[] }>();
    map.set(1, { points: [{ x: 10, y: 20 }] });
    expect(pipe.transform(1, map)).toBeTrue();
  });

  it('should return false when the path exists but points array is empty', () => {
    const map = new Map<number, { points: { x: number; y: number }[] }>();
    map.set(2, { points: [] });
    expect(pipe.transform(2, map)).toBeFalse();
  });

  it('should return false when the routeId is not in the map', () => {
    const map = new Map<number, { points: { x: number; y: number }[] }>();
    map.set(1, { points: [{ x: 10, y: 20 }] });
    expect(pipe.transform(3, map)).toBeFalse();
  });

  it('should return false when map is empty', () => {
    const map = new Map<number, { points: { x: number; y: number }[] }>();
    expect(pipe.transform(1, map)).toBeFalse();
  });
});
