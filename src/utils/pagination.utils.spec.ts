import { getPaginationBounds } from './pagination.utils';

describe('Pagination Utils', () => {
  describe('getPaginationBounds', () => {
    it('should calculate bounds for first page (page 0)', () => {
      expect(getPaginationBounds(0, 10)).toEqual({ from: 0, to: 9 });
    });

    it('should calculate bounds for second page (page 1)', () => {
      expect(getPaginationBounds(1, 10)).toEqual({ from: 10, to: 19 });
    });

    it('should handle page size of 1', () => {
      expect(getPaginationBounds(0, 1)).toEqual({ from: 0, to: 0 });
      expect(getPaginationBounds(5, 1)).toEqual({ from: 5, to: 5 });
    });

    it('should calculate mathematically for negative pages (though normally unusual)', () => {
      expect(getPaginationBounds(-1, 10)).toEqual({ from: -10, to: -1 });
    });

    it('should calculate mathematically for negative sizes', () => {
      expect(getPaginationBounds(1, -10)).toEqual({ from: -10, to: -21 });
    });

    it('should handle size of 0', () => {
      expect(getPaginationBounds(0, 0)).toEqual({ from: 0, to: -1 });
      expect(getPaginationBounds(1, 0)).toEqual({ from: 0, to: -1 });
    });
  });
});
