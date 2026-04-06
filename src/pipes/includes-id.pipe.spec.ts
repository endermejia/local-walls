import { IncludesIdPipe } from './includes-id.pipe';

describe('IncludesIdPipe', () => {
  let pipe: IncludesIdPipe;

  beforeEach(() => {
    pipe = new IncludesIdPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('happy paths', () => {
    it('should return true if the array of objects contains an item with the given string id', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      expect(pipe.transform(items, '2')).toBeTrue();
    });

    it('should return false if the array of objects does not contain an item with the given string id', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      expect(pipe.transform(items, '4')).toBeFalse();
    });

    it('should return true if the array of objects contains an item with the given number id', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(pipe.transform(items, 2)).toBeTrue();
    });

    it('should return false if the array of objects does not contain an item with the given number id', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(pipe.transform(items, 4)).toBeFalse();
    });

    it('should return true if the array of primitives contains the given string', () => {
      const items = ['a', 'b', 'c'];
      expect(pipe.transform(items, 'b')).toBeTrue();
    });

    it('should return false if the array of primitives does not contain the given string', () => {
      const items = ['a', 'b', 'c'];
      expect(pipe.transform(items, 'd')).toBeFalse();
    });

    it('should return true if the array of primitives contains the given number', () => {
      const items = [1, 2, 3];
      expect(pipe.transform(items, 2)).toBeTrue();
    });

    it('should return false if the array of primitives does not contain the given number', () => {
      const items = [1, 2, 3];
      expect(pipe.transform(items, 4)).toBeFalse();
    });
  });

  describe('edge cases and error conditions', () => {
    it('should return false if items is null', () => {
      expect(pipe.transform(null, '1')).toBeFalse();
    });

    it('should return false if items is undefined', () => {
      expect(pipe.transform(undefined, '1')).toBeFalse();
    });

    it('should return false if items is empty', () => {
      expect(pipe.transform([], '1')).toBeFalse();
    });

    it('should return false if id is null', () => {
      expect(pipe.transform([{ id: '1' }], null)).toBeFalse();
    });

    it('should return false if id is undefined', () => {
      expect(pipe.transform([{ id: '1' }], undefined)).toBeFalse();
    });

    it('should return false if both items and id are null or undefined', () => {
      expect(pipe.transform(null, null)).toBeFalse();
      expect(pipe.transform(undefined, undefined)).toBeFalse();
    });

    it('should handle array with mixed types gracefully', () => {
      const items = [{ id: '1' }, 2, '3', null, undefined, { other: 'prop' }] as any[];
      expect(pipe.transform(items, '1')).toBeTrue();
      expect(pipe.transform(items, 2)).toBeTrue();
      expect(pipe.transform(items, '3')).toBeTrue();
      expect(pipe.transform(items, 'other')).toBeFalse();
    });

    it('should use strict equality for matching string and number', () => {
      const items = [{ id: '1' }, { id: 2 }];
      expect(pipe.transform(items, 1)).toBeFalse();
      expect(pipe.transform(items, '2')).toBeFalse();
    });

    it('should return false if the object does not have an id property', () => {
      const items = [{ name: 'test' }] as any[];
      expect(pipe.transform(items, 'test')).toBeFalse();
    });
  });
});
