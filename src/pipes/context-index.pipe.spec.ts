import { ContextIndexPipe } from './context-index.pipe';

describe('ContextIndexPipe', () => {
  let pipe: ContextIndexPipe;

  beforeEach(() => {
    pipe = new ContextIndexPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the context if it is a number', () => {
    expect(pipe.transform(5)).toBe(5);
    expect(pipe.transform(0)).toBe(0);
    expect(pipe.transform(-1)).toBe(-1);
  });

  it('should return the index property if context is an object with a number index', () => {
    expect(pipe.transform({ index: 3 })).toBe(3);
    expect(pipe.transform({ index: 0, other: 'value' })).toBe(0);
  });

  it('should return the $implicit property if context is an object with a number $implicit', () => {
    expect(pipe.transform({ $implicit: 4 })).toBe(4);
    expect(pipe.transform({ $implicit: 0, other: 'value' })).toBe(0);
  });

  it('should return 0 if context is null', () => {
    expect(pipe.transform(null)).toBe(0);
  });

  it('should return 0 if context is undefined', () => {
    expect(pipe.transform(undefined)).toBe(0);
  });

  it('should return 0 if context is an object without index or $implicit', () => {
    expect(pipe.transform({ someProp: 1 })).toBe(0);
    expect(pipe.transform({})).toBe(0);
  });

  it('should return 0 if index is not a number', () => {
    expect(pipe.transform({ index: '3' } as any)).toBe(0);
  });

  it('should return 0 if $implicit is not a number', () => {
    expect(pipe.transform({ $implicit: '4' } as any)).toBe(0);
  });
});
