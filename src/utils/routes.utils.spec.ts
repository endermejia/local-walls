import { mapRouteToTableRow, ROUTE_TABLE_SORTERS, sortRoutesByGrade } from './routes.utils';
import { RouteWithExtras, RoutesTableRow, PROJECT_GRADE_LABEL, VERTICAL_LIFE_GRADES, RouteDto } from '../models';

describe('routes.utils', () => {

  describe('mapRouteToTableRow', () => {
    it('should correctly map a complete RouteWithExtras to a RoutesTableRow', () => {
      const mockRoute: RouteWithExtras = {
        id: 123,
        crag_id: 1,
        user_creator_id: 'user1',
        eight_anu_route_slugs: [],
        height: 25,
        name: 'Test Route',
        slug: 'test-route',
        grade: VERTICAL_LIFE_GRADES.G8a,
        climbing_kind: 'sport',
        rating: 4.5,
        ascent_count: 10,
        liked: true,
        project: false,
        climbed: true,

        area_slug: 'test-area',
        area_name: 'Test Area',
        crag_slug: 'test-crag',
        crag_name: 'Test Crag',
        topos: [
          { id: 2, name: 'B Topo', slug: 'b-topo' },
          { id: 1, name: 'A Topo', slug: 'a-topo' }
        ],
        created_at: '',
        area_id: undefined,
        equippers: [],


      };

      const result = mapRouteToTableRow(mockRoute);

      expect(result.key).toBe('123');
      expect(result.grade).toBe('8a');
      expect(result.route).toBe('Test Route');
      expect(result.area_name).toBe('Test Area');
      expect(result.crag_name).toBe('Test Crag');
      expect(result.area_slug).toBe('test-area');
      expect(result.crag_slug).toBe('test-crag');
      expect(result.height).toBe(25);
      expect(result.rating).toBe(4.5);
      expect(result.ascents).toBe(10);
      expect(result.liked).toBe(true);
      expect(result.project).toBe(false);
      expect(result.climbed).toBe(true);
      expect(result.link).toEqual(['/area', 'test-area', 'test-crag', 'test-route']);
      // Topos should be sorted by normalized name (A Topo before B Topo)
      expect(result.topos[0].name).toBe('A Topo');
      expect(result.topos[1].name).toBe('B Topo');
      expect(result._ref).toBe(mockRoute);
    });

    it('should handle optional properties and defaults gracefully', () => {
      const mockMinimalRoute: RouteWithExtras = {
        id: 456,
        crag_id: 1,
        user_creator_id: 'user1',
        eight_anu_route_slugs: [],
        height: null,
        name: 'Minimal Route',
        slug: 'minimal-route',
        grade: null as any, // Simulate missing grade
        climbing_kind: 'sport',
        liked: false,
        project: true,
        created_at: '',
        area_id: undefined,
        equippers: [],


      };

      const result = mapRouteToTableRow(mockMinimalRoute);

      expect(result.key).toBe('456');
      expect(result.grade).toBe(PROJECT_GRADE_LABEL);
      expect(result.rating).toBe(0);
      expect(result.ascents).toBe(0);
      expect(result.height).toBeNull();
      expect(result.climbed).toBe(false);
      expect(result.link).toEqual(['/area', 'unknown', 'unknown', 'minimal-route']);
      expect(result.topos).toEqual([]);
    });

    it('should fallback grade mapping to PROJECT_GRADE_LABEL if grade is 0', () => {
      const mockRouteWithG0: RouteWithExtras = {
        id: 789,
        crag_id: 1,
        user_creator_id: 'user1',
        eight_anu_route_slugs: [],
        height: null,
        name: 'G0 Route',
        slug: 'g0-route',
        grade: VERTICAL_LIFE_GRADES.G0,
        climbing_kind: 'sport',
        liked: false,
        project: true,
        created_at: '',
        area_id: undefined,
        equippers: [],


      };

      const result = mapRouteToTableRow(mockRouteWithG0);
      expect(result.grade).toBe(PROJECT_GRADE_LABEL);
    });
  });

});

  describe('ROUTE_TABLE_SORTERS', () => {

    // Helper to generate a minimal RoutesTableRow for sorting
    function createRow(overrides: Partial<RoutesTableRow>): RoutesTableRow {
      return {
        key: '1',
        grade: '5a',
        route: 'Default Route',
        height: null,
        rating: 0,
        ascents: 0,
        liked: false,
        project: false,
        climbed: false,
        link: [],
        topos: [],
        _ref: {} as any,
        ...overrides,
      };
    }

    it('should sort by grade', () => {
      const sorter = ROUTE_TABLE_SORTERS['grade'];
      const rowA = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G5a } as any });
      const rowB = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G8a } as any });

      expect(sorter(rowA, rowB)).toBeLessThan(0);
      expect(sorter(rowB, rowA)).toBeGreaterThan(0);
      expect(sorter(rowA, rowA)).toBe(0);
    });

    it('should sort by route name', () => {
      const sorter = ROUTE_TABLE_SORTERS['route'];
      const rowA = createRow({ route: 'Apple' });
      const rowB = createRow({ route: 'Banana' });

      expect(sorter(rowA, rowB)).toBeLessThan(0);
      expect(sorter(rowB, rowA)).toBeGreaterThan(0);
      expect(sorter(rowA, rowA)).toBe(0);
    });

    it('should sort by height (falling back to 0 for nullish values)', () => {
      const sorter = ROUTE_TABLE_SORTERS['height'];
      const rowA = createRow({ height: 10 });
      const rowB = createRow({ height: 20 });
      const rowC = createRow({ height: null });

      expect(sorter(rowA, rowB)).toBeLessThan(0);
      expect(sorter(rowB, rowA)).toBeGreaterThan(0);
      expect(sorter(rowC, rowA)).toBeLessThan(0); // null -> 0, which is < 10
    });

    it('should sort by rating', () => {
      const sorter = ROUTE_TABLE_SORTERS['rating'];
      const rowA = createRow({ rating: 2 });
      const rowB = createRow({ rating: 5 });

      expect(sorter(rowA, rowB)).toBeLessThan(0);
      expect(sorter(rowB, rowA)).toBeGreaterThan(0);
    });

    it('should sort by ascents', () => {
      const sorter = ROUTE_TABLE_SORTERS['ascents'];
      const rowA = createRow({ ascents: 100 });
      const rowB = createRow({ ascents: 500 });

      expect(sorter(rowA, rowB)).toBeLessThan(0);
      expect(sorter(rowB, rowA)).toBeGreaterThan(0);
    });

    it('should sort by topo name (joined), falling back to route name', () => {
      const sorter = ROUTE_TABLE_SORTERS['topo'];

      const rowA = createRow({ topos: [{ id: 1, name: 'Alpha Topo' }], route: 'Z Route' });
      const rowB = createRow({ topos: [{ id: 2, name: 'Beta Topo' }], route: 'A Route' });

      // Alpha Topo < Beta Topo
      expect(sorter(rowA, rowB)).toBeLessThan(0);

      // Fallback to route name if topos are empty
      const rowC = createRow({ topos: [], route: 'Apple' });
      const rowD = createRow({ topos: [], route: 'Banana' });

      expect(sorter(rowC, rowD)).toBeLessThan(0);
    });
  });

  describe('sortRoutesByGrade', () => {
    it('should sort routes by grade descending', () => {
      const routes: Partial<RouteDto>[] = [
        { id: 1, name: 'A', grade: VERTICAL_LIFE_GRADES.G5a },
        { id: 2, name: 'B', grade: VERTICAL_LIFE_GRADES.G8a },
        { id: 3, name: 'C', grade: VERTICAL_LIFE_GRADES.G6b },
      ];

      const sorted = sortRoutesByGrade(routes);

      expect(sorted[0].id).toBe(2); // 8a
      expect(sorted[1].id).toBe(3); // 6b
      expect(sorted[2].id).toBe(1); // 5a
    });

    it('should sort routes with same grade by name', () => {
      const routes: Partial<RouteDto>[] = [
        { id: 1, name: 'Zebra', grade: VERTICAL_LIFE_GRADES.G6b },
        { id: 2, name: 'Apple', grade: VERTICAL_LIFE_GRADES.G6b },
        { id: 3, name: 'Mango', grade: VERTICAL_LIFE_GRADES.G6b },
      ];

      const sorted = sortRoutesByGrade(routes);

      expect(sorted[0].id).toBe(2); // Apple
      expect(sorted[1].id).toBe(3); // Mango
      expect(sorted[2].id).toBe(1); // Zebra
    });

    it('should handle missing grades, defaulting to 0', () => {
      const routes: Partial<RouteDto>[] = [
        { id: 1, name: 'Missing Grade' },
        { id: 2, name: 'B', grade: VERTICAL_LIFE_GRADES.G5a },
      ];

      const sorted = sortRoutesByGrade(routes);

      expect(sorted[0].id).toBe(2); // 5a
      expect(sorted[1].id).toBe(1); // missing (0)
    });

    it('should not mutate original array', () => {
      const routes: Partial<RouteDto>[] = [
        { id: 1, name: 'A', grade: VERTICAL_LIFE_GRADES.G5a },
        { id: 2, name: 'B', grade: VERTICAL_LIFE_GRADES.G8a },
      ];

      const sorted = sortRoutesByGrade(routes);

      expect(sorted).not.toBe(routes);
      expect(routes[0].id).toBe(1); // original order maintained
    });
  });
