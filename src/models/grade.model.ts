// Grade model: enum of French sport grades, type alias from enum values,
// and ordered lists for convenience.
import { ClimbingKind, ClimbingKinds } from './app-enums.model';

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

export const PROJECT_GRADE_LABEL = '?' as const;

export type GradeLabel =
  | `${'3' | '4'}${GradeLetter}`
  | `${'5' | '6' | '7' | '8' | '9'}${GradeLetter}${GradeSuffix}`
  | typeof PROJECT_GRADE_LABEL;

// Ordered grade values must reflect exactly the enum VERTICAL_LIFE_GRADES.
// We derive them from VERTICAL_LIFE_TO_LABEL in the numeric order of the enum
// to avoid any labels that are not represented by the enum (e.g., plain '5').
// The mapping is defined below; ORDERED_GRADE_VALUES is declared after it.

export type RoutesByGrade = Partial<Record<GradeLabel, number>>;

// Centralized mappings between Vertical Life enum and GradeLabel
export const GRADE_NUMBER_TO_LABEL: Partial<
  Record<VERTICAL_LIFE_GRADES, GradeLabel>
> = {
  [VERTICAL_LIFE_GRADES.G0]: PROJECT_GRADE_LABEL,
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

export const GRADE_TO_YDS: Partial<Record<VERTICAL_LIFE_GRADES, string>> = {
  [VERTICAL_LIFE_GRADES.G3a]: '5.3',
  [VERTICAL_LIFE_GRADES.G3b]: '5.4',
  [VERTICAL_LIFE_GRADES.G3c]: '5.5',
  [VERTICAL_LIFE_GRADES.G4a]: '5.6',
  [VERTICAL_LIFE_GRADES.G4b]: '5.6',
  [VERTICAL_LIFE_GRADES.G4c]: '5.7',
  [VERTICAL_LIFE_GRADES.G5a]: '5.8',
  [VERTICAL_LIFE_GRADES.G5aPlus]: '5.8',
  [VERTICAL_LIFE_GRADES.G5b]: '5.9',
  [VERTICAL_LIFE_GRADES.G5bPlus]: '5.9',
  [VERTICAL_LIFE_GRADES.G5c]: '5.10a',
  [VERTICAL_LIFE_GRADES.G5cPlus]: '5.10a',
  [VERTICAL_LIFE_GRADES.G6a]: '5.10a',
  [VERTICAL_LIFE_GRADES.G6aPlus]: '5.10b',
  [VERTICAL_LIFE_GRADES.G6b]: '5.10c',
  [VERTICAL_LIFE_GRADES.G6bPlus]: '5.10d',
  [VERTICAL_LIFE_GRADES.G6c]: '5.11a',
  [VERTICAL_LIFE_GRADES.G6cPlus]: '5.11c',
  [VERTICAL_LIFE_GRADES.G7a]: '5.11d',
  [VERTICAL_LIFE_GRADES.G7aPlus]: '5.12a',
  [VERTICAL_LIFE_GRADES.G7b]: '5.12b',
  [VERTICAL_LIFE_GRADES.G7bPlus]: '5.12c',
  [VERTICAL_LIFE_GRADES.G7c]: '5.12d',
  [VERTICAL_LIFE_GRADES.G7cPlus]: '5.13a',
  [VERTICAL_LIFE_GRADES.G8a]: '5.13b',
  [VERTICAL_LIFE_GRADES.G8aPlus]: '5.13c',
  [VERTICAL_LIFE_GRADES.G8b]: '5.13d',
  [VERTICAL_LIFE_GRADES.G8bPlus]: '5.14a',
  [VERTICAL_LIFE_GRADES.G8c]: '5.14b',
  [VERTICAL_LIFE_GRADES.G8cPlus]: '5.14c',
  [VERTICAL_LIFE_GRADES.G9a]: '5.14d',
  [VERTICAL_LIFE_GRADES.G9aPlus]: '5.15a',
  [VERTICAL_LIFE_GRADES.G9b]: '5.15b',
  [VERTICAL_LIFE_GRADES.G9bPlus]: '5.15c',
  [VERTICAL_LIFE_GRADES.G9c]: '5.15d',
};

export const GRADE_TO_V_SCALE: Partial<Record<VERTICAL_LIFE_GRADES, string>> = {
  [VERTICAL_LIFE_GRADES.G3a]: 'VB',
  [VERTICAL_LIFE_GRADES.G3b]: 'VB',
  [VERTICAL_LIFE_GRADES.G3c]: 'VB',
  [VERTICAL_LIFE_GRADES.G4a]: 'V0-',
  [VERTICAL_LIFE_GRADES.G4b]: 'V0',
  [VERTICAL_LIFE_GRADES.G4c]: 'V0+',
  [VERTICAL_LIFE_GRADES.G5a]: 'V1',
  [VERTICAL_LIFE_GRADES.G5aPlus]: 'V1',
  [VERTICAL_LIFE_GRADES.G5b]: 'V1',
  [VERTICAL_LIFE_GRADES.G5bPlus]: 'V2',
  [VERTICAL_LIFE_GRADES.G5c]: 'V2',
  [VERTICAL_LIFE_GRADES.G5cPlus]: 'V2',
  [VERTICAL_LIFE_GRADES.G6a]: 'V2',
  [VERTICAL_LIFE_GRADES.G6aPlus]: 'V3',
  [VERTICAL_LIFE_GRADES.G6b]: 'V4',
  [VERTICAL_LIFE_GRADES.G6bPlus]: 'V4',
  [VERTICAL_LIFE_GRADES.G6c]: 'V5',
  [VERTICAL_LIFE_GRADES.G6cPlus]: 'V6',
  [VERTICAL_LIFE_GRADES.G7a]: 'V6',
  [VERTICAL_LIFE_GRADES.G7aPlus]: 'V7',
  [VERTICAL_LIFE_GRADES.G7b]: 'V8',
  [VERTICAL_LIFE_GRADES.G7bPlus]: 'V8',
  [VERTICAL_LIFE_GRADES.G7c]: 'V9',
  [VERTICAL_LIFE_GRADES.G7cPlus]: 'V10',
  [VERTICAL_LIFE_GRADES.G8a]: 'V11',
  [VERTICAL_LIFE_GRADES.G8aPlus]: 'V12',
  [VERTICAL_LIFE_GRADES.G8b]: 'V13',
  [VERTICAL_LIFE_GRADES.G8bPlus]: 'V14',
  [VERTICAL_LIFE_GRADES.G8c]: 'V15',
  [VERTICAL_LIFE_GRADES.G8cPlus]: 'V16',
  [VERTICAL_LIFE_GRADES.G9a]: 'V17',
};

export function getEquivalentGrade(
  grade: VERTICAL_LIFE_GRADES | number,
  kind?: ClimbingKind | null,
): string | null {
  if (kind === ClimbingKinds.BOULDER) {
    return GRADE_TO_V_SCALE[grade as VERTICAL_LIFE_GRADES] || null;
  }
  return GRADE_TO_YDS[grade as VERTICAL_LIFE_GRADES] || null;
}

export const LABEL_TO_VERTICAL_LIFE: Partial<
  Record<GradeLabel, VERTICAL_LIFE_GRADES>
> = Object.fromEntries(
  Object.entries(GRADE_NUMBER_TO_LABEL).map(([k, v]) => [v, Number(k)]),
);

// Ordered grade values derived strictly from the enum mapping above
export const ORDERED_GRADE_VALUES: readonly GradeLabel[] = Object.entries(
  GRADE_NUMBER_TO_LABEL,
)
  .sort((a, b) => {
    const na = Number(a[0]);
    const nb = Number(b[0]);
    if (na === 0) return 1;
    if (nb === 0) return -1;
    return na - nb;
  })
  .map(([, v]) => v)
  .filter(
    (v): v is GradeLabel => typeof v === 'string',
  ) as readonly GradeLabel[];

export function bandForGradeLabel(
  g: GradeLabel | number | string,
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!g) return 5;
  const s = String(g);
  const base = parseInt(s.charAt(0), 10);
  if (!base) return 5;
  if (base <= 5) return 0;
  if (base === 6) return 1;
  if (base === 7) return 2;
  if (base === 8) return 3;
  return 4; // 9
}

export const GRADE_COLORS = [
  'var(--tui-text-positive)', // easy/green
  'var(--tui-status-info)', // moderate/blue
  'var(--tui-status-warning)', // difficult/orange
  'var(--tui-status-negative)', // hard/red
  'var(--tui-background-accent-opposite)', // extreme/black
  '#cda4de', // lila (projects)
];

export function colorForGrade(g: GradeLabel): string {
  const band = bandForGradeLabel(g);
  return GRADE_COLORS[band] || 'var(--tui-text-primary)';
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
      const label = GRADE_NUMBER_TO_LABEL[num];
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

  // Special case: projects are excluded from range filter and always visible
  if (byLabel[PROJECT_GRADE_LABEL]) return true;

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
