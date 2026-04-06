import { remToPx } from './rem-to-px';

describe('remToPx', () => {
  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(remToPx('')).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(remToPx('abc')).toBe(0);
    });
  });

  describe('SSR or environments without window/document', () => {
    it('should convert px to integer correctly', () => {
      expect(remToPx('20px')).toBe(20);
      expect(remToPx('20.5px')).toBe(21);
      expect(remToPx('20.4px')).toBe(20);
    });
  });

  describe('environments with window/document (client side)', () => {
    let originalGetComputedStyle: typeof window.getComputedStyle;

    beforeEach(() => {
      // Mock window.getComputedStyle to return predictable font sizes
      if (typeof window !== 'undefined') {
        originalGetComputedStyle = window.getComputedStyle;
      }
    });

    afterEach(() => {
      if (typeof window !== 'undefined' && originalGetComputedStyle) {
        window.getComputedStyle = originalGetComputedStyle;
      }
    });

    it('should convert px to integer correctly without checking font size', () => {
      if (typeof window !== 'undefined' && typeof spyOn !== 'undefined') {
        spyOn(window, 'getComputedStyle').and.returnValue({ fontSize: '20px' } as unknown as CSSStyleDeclaration);
      }
      expect(remToPx('20px')).toBe(20);
      expect(remToPx('20.5px')).toBe(21);
      expect(remToPx('20.4px')).toBe(20);
    });

    it('should convert rem to integer using computed font size', () => {
      if (typeof window !== 'undefined' && typeof spyOn !== 'undefined') {
        spyOn(window, 'getComputedStyle').and.returnValue({ fontSize: '20px' } as unknown as CSSStyleDeclaration);
        expect(remToPx('1rem')).toBe(20);
        expect(remToPx('1.5rem')).toBe(30);
      } else {
        // Fallback for bun test environment where window might not exist or spyOn might behave differently
        expect(remToPx('1rem')).toBe(16);
      }
    });

    it('should convert rem to integer using fallback base 16px if computed font size is invalid', () => {
      if (typeof window !== 'undefined' && typeof spyOn !== 'undefined') {
        spyOn(window, 'getComputedStyle').and.returnValue({ fontSize: 'invalid' } as unknown as CSSStyleDeclaration);
      }
      expect(remToPx('1rem')).toBe(16);
      expect(remToPx('1.5rem')).toBe(24);
    });

    it('should convert rem to integer using fallback base 16px if computed font size is not returned', () => {
      if (typeof window !== 'undefined' && typeof spyOn !== 'undefined') {
        spyOn(window, 'getComputedStyle').and.returnValue({} as unknown as CSSStyleDeclaration);
      }
      expect(remToPx('1rem')).toBe(16);
      expect(remToPx('1.5rem')).toBe(24);
    });
  });
});
