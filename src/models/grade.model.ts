// Grade model: enum of French sport grades, type alias from enum values,
// and ordered lists for convenience.
export enum VERTICAL_LIFE_GRADES {
  G0 = 0, // unknown/lowest bucket
  G1 = 1, // 1
  G2 = 2, // 2
  G3a = 3, // 3a
  G3b = 4, // 3b
  G3c = 5, // 3c
  G4a = 6, // 4a
  G4b = 7, // 4b
  G8 = 8, // reserved
  G4c = 9, // 4c
  G5a = 10, // 5a
  G5aPlus = 11, // 5a+
  G5b = 12, // 5b
  G5bPlus = 13, // 5b+
  G5c = 14, // 5c
  G5cPlus = 15, // 5c+
  G6a = 16, // 6a
  G6aPlus = 17, // 6a+
  G6b = 18, // 6b
  G6bPlus = 19, // 6b+
  G20 = 20, // reserved
  G6c = 21, // 6c
  G6cPlus = 22, // 6c+
  G7a = 23, // 7a
  G7aPlus = 24, // 7a+
  G7b = 25, // 7b
  G7bPlus = 26, // 7b+
  G7c = 27, // 7c
  G7cPlus = 28, // 7c+
  G8a = 29, // 8a
  G8aPlus = 30, // 8a+
  G8b = 31, // 8b
  G8bPlus = 32, // 8b+
  G8c = 33, // 8c
  G8cPlus = 34, // 8c+
  G9a = 35, // 9a
  G9aPlus = 36, // 9a+
  G9b = 37, // 9b
  G9bPlus = 38, // 9b+
  G9c = 39, // 9c
}

export type AmountByEveryGrade = Partial<
  Record<VERTICAL_LIFE_GRADES, number | null>
>;

// Generate grade labels programmatically to avoid repetition
export type GradeLetter = 'a' | 'b' | 'c';
export type GradeSuffix = '' | '+';

export type GradeLabel =
  | `${'3' | '4'}${GradeLetter}`
  | `${'5' | '6' | '7' | '8' | '9'}${GradeLetter}${GradeSuffix}`
  | '5';

// Ordered grade values must reflect exactly the enum VERTICAL_LIFE_GRADES.
// We derive them from VERTICAL_LIFE_TO_LABEL in the numeric order of the enum
// to avoid any labels that are not represented by the enum (e.g., plain '5').
// The mapping is defined below; ORDERED_GRADE_VALUES is declared after it.

export type RoutesByGrade = Partial<Record<GradeLabel, number>>;

// Centralized mappings between Vertical Life enum and GradeLabel
export const VERTICAL_LIFE_TO_LABEL: Partial<
  Record<VERTICAL_LIFE_GRADES, GradeLabel>
> = {
  [VERTICAL_LIFE_GRADES.G3a]: '3a',
  [VERTICAL_LIFE_GRADES.G3b]: '3b',
  [VERTICAL_LIFE_GRADES.G3c]: '3c',
  [VERTICAL_LIFE_GRADES.G4a]: '4a',
  [VERTICAL_LIFE_GRADES.G4b]: '4b',
  [VERTICAL_LIFE_GRADES.G4c]: '4c',
  [VERTICAL_LIFE_GRADES.G5a]: '5a',
  [VERTICAL_LIFE_GRADES.G5aPlus]: '5a+',
  [VERTICAL_LIFE_GRADES.G5b]: '5b',
  [VERTICAL_LIFE_GRADES.G5bPlus]: '5b+',
  [VERTICAL_LIFE_GRADES.G5c]: '5c',
  [VERTICAL_LIFE_GRADES.G5cPlus]: '5c+',
  [VERTICAL_LIFE_GRADES.G6a]: '6a',
  [VERTICAL_LIFE_GRADES.G6aPlus]: '6a+',
  [VERTICAL_LIFE_GRADES.G6b]: '6b',
  [VERTICAL_LIFE_GRADES.G6bPlus]: '6b+',
  [VERTICAL_LIFE_GRADES.G6c]: '6c',
  [VERTICAL_LIFE_GRADES.G6cPlus]: '6c+',
  [VERTICAL_LIFE_GRADES.G7a]: '7a',
  [VERTICAL_LIFE_GRADES.G7aPlus]: '7a+',
  [VERTICAL_LIFE_GRADES.G7b]: '7b',
  [VERTICAL_LIFE_GRADES.G7bPlus]: '7b+',
  [VERTICAL_LIFE_GRADES.G7c]: '7c',
  [VERTICAL_LIFE_GRADES.G7cPlus]: '7c+',
  [VERTICAL_LIFE_GRADES.G8a]: '8a',
  [VERTICAL_LIFE_GRADES.G8aPlus]: '8a+',
  [VERTICAL_LIFE_GRADES.G8b]: '8b',
  [VERTICAL_LIFE_GRADES.G8bPlus]: '8b+',
  [VERTICAL_LIFE_GRADES.G8c]: '8c',
  [VERTICAL_LIFE_GRADES.G8cPlus]: '8c+',
  [VERTICAL_LIFE_GRADES.G9a]: '9a',
  [VERTICAL_LIFE_GRADES.G9aPlus]: '9a+',
  [VERTICAL_LIFE_GRADES.G9b]: '9b',
  [VERTICAL_LIFE_GRADES.G9bPlus]: '9b+',
  [VERTICAL_LIFE_GRADES.G9c]: '9c',
};

export const LABEL_TO_VERTICAL_LIFE: Partial<
  Record<GradeLabel, VERTICAL_LIFE_GRADES>
> = Object.fromEntries(
  Object.entries(VERTICAL_LIFE_TO_LABEL).map(([k, v]) => [v, Number(k)]),
);

// Ordered grade values derived strictly from the enum mapping above
export const ORDERED_GRADE_VALUES: readonly GradeLabel[] = Object.entries(
  VERTICAL_LIFE_TO_LABEL,
)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([, v]) => v)
  .filter(
    (v): v is GradeLabel => typeof v === 'string',
  ) as readonly GradeLabel[];

export function bandForGradeLabel(g: GradeLabel): 0 | 1 | 2 | 3 | 4 {
  const base = parseInt(g.charAt(0), 10);
  if (!Number.isFinite(base)) return 0;
  if (base <= 5) return 0;
  if (base === 6) return 1;
  if (base === 7) return 2;
  if (base === 8) return 3;
  return 4; // 9
}

export function colorForGrade(g: GradeLabel): string {
  const band = bandForGradeLabel(g);
  switch (band) {
    case 0:
      return 'var(--tui-text-positive)';
    case 1:
      return 'var(--tui-status-info)';
    case 2:
      return 'var(--tui-status-warning)';
    case 3:
      return 'var(--tui-status-negative)';
    case 4:
      return 'var(--tui-background-accent-opposite)';
    default:
      return 'var(--tui-text-primary)';
  }
}

export function normalizeRoutesByGrade(
  input: AmountByEveryGrade | RoutesByGrade | undefined,
): RoutesByGrade {
  const out: RoutesByGrade = {};
  if (!input) return out;

  // If keys look like enum numbers, map through VERTICAL_LIFE_TO_LABEL
  const isEnumLike = Object.keys(input as object).some((k) => /^\d+$/.test(k));
  if (isEnumLike) {
    for (const [k, v] of Object.entries(input as AmountByEveryGrade)) {
      const num = Number(k) as VERTICAL_LIFE_GRADES;
      const label = VERTICAL_LIFE_TO_LABEL[num];
      if (label && v) out[label] = v;
    }
    return out;
  }

  // Otherwise assume it's label-based already
  for (const [k, v] of Object.entries(input as RoutesByGrade)) {
    if ((ORDERED_GRADE_VALUES as readonly string[]).includes(k) && v) {
      out[k as GradeLabel] = v;
    }
  }
  return out;
}

/**
 * Checks if the grades in byLabel overlap with the selected index range [selMin, selMax]
 * in ORDERED_GRADE_VALUES.
 */
export function isGradeRangeOverlap(
  byLabel: RoutesByGrade,
  selMin: number,
  selMax: number,
): boolean {
  const labels = Object.keys(byLabel);
  if (!labels.length) return true; // no data, don't filter out

  let minIdx = Number.POSITIVE_INFINITY;
  let maxIdx = Number.NEGATIVE_INFINITY;

  for (const lab of labels) {
    const idx = ORDERED_GRADE_VALUES.indexOf(lab as GradeLabel);
    if (idx === -1) continue;
    const count = byLabel[lab as GradeLabel];
    if (!count) continue;
    if (idx < minIdx) minIdx = idx;
    if (idx > maxIdx) maxIdx = idx;
  }

  if (!Number.isFinite(minIdx) || !Number.isFinite(maxIdx)) return true;
  return maxIdx >= selMin && minIdx <= selMax;
}

export interface ShadeFilterOptions {
  shade_morning?: boolean;
  shade_afternoon?: boolean;
  shade_all_day?: boolean;
  sun_all_day?: boolean;
}

/**
 * Checks if an item matches the selected shade filters.
 */
export function matchesShadeFilter(
  item: ShadeFilterOptions,
  selectedShades: string[],
): boolean {
  if (!selectedShades.length) return true;
  if (
    item.shade_morning === undefined &&
    item.shade_afternoon === undefined &&
    item.shade_all_day === undefined &&
    item.sun_all_day === undefined
  ) {
    return true;
  }

  return selectedShades.some((s) => {
    if (s === 'shade_morning') return item.shade_morning;
    if (s === 'shade_afternoon') return item.shade_afternoon;
    if (s === 'shade_all_day') return item.shade_all_day;
    if (s === 'sun_all_day') return item.sun_all_day;
    return false;
  });
}
