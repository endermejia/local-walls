import { slugify, normalizeName } from './slugify';

describe('Slugify Utils', () => {
  describe('slugify', () => {
    it('should lowercase text', () => {
      expect(slugify('TEXT')).toBe('text');
      expect(slugify('CamelCase')).toBe('camelcase');
    });

    it('should remove diacritics', () => {
      expect(slugify('crème brûlée')).toBe('creme-brulee');
      expect(slugify('jalapeño')).toBe('jalapeno');
      expect(slugify('aàáâãäå eèéêë iìíîï oòóôõö uùúûü')).toBe(
        'aaaaaaa-eeeee-iiiii-oooooo-uuuuu',
      );
    });

    it('should replace non-alphanumeric characters with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
      expect(slugify('user@example.com')).toBe('user-example-com');
      expect(slugify('C++ Programming!')).toBe('c-programming');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
      expect(slugify('foo  bar')).toBe('foo-bar');
    });

    it('should trim hyphens at the ends', () => {
      expect(slugify('-hello-world-')).toBe('hello-world');
      expect(slugify('!hello world?')).toBe('hello-world');
    });

    it('should handle empty, null, and undefined values', () => {
      expect(slugify('')).toBe('');
      expect(slugify(null)).toBe('');
      expect(slugify(undefined)).toBe('');
    });
  });

  describe('normalizeName', () => {
    it('should lowercase text', () => {
      expect(normalizeName('TEXT')).toBe('text');
      expect(normalizeName('CamelCase')).toBe('camelcase');
    });

    it('should remove diacritics', () => {
      expect(normalizeName('crème brûlée')).toBe('creme brulee');
      expect(normalizeName('jalapeño')).toBe('jalapeno');
      expect(normalizeName('aàáâãäå eèéêë iìíîï oòóôõö uùúûü')).toBe(
        'aaaaaaa eeeee iiiii oooooo uuuuu',
      );
    });

    it('should not replace spaces or other special characters', () => {
      expect(normalizeName('hello world')).toBe('hello world');
      expect(normalizeName('user@example.com')).toBe('user@example.com');
      expect(normalizeName('C++ Programming!')).toBe('c++ programming!');
    });

    it('should trim whitespace at the ends', () => {
      expect(normalizeName('  hello world  ')).toBe('hello world');
    });

    it('should handle empty, null, and undefined values', () => {
      expect(normalizeName('')).toBe('');
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
    });
  });
});
