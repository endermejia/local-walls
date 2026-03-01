import {
  bandForGradeLabel,
  GradeLabel,
  ORDERED_GRADE_VALUES,
  RoutesByGrade,
  PROJECT_GRADE_LABEL,
} from '../models';

export interface GradeChartData {
  values: readonly number[];
  total: number;
  hasActive: boolean;
  activeBandTotal: number;
  breakdown: { grade: GradeLabel; count: number }[];
  gradeRange: string;
  breakdownText: string;
}

export function computeGradeChartData(
  counts: RoutesByGrade,
  activeItemIndex: number,
): GradeChartData {
  const allGrades = ORDERED_GRADE_VALUES;

  const bands = [0, 0, 0, 0, 0, 0];
  for (const g of allGrades) {
    const v = counts[g] ?? 0;
    if (!v) continue;
    const b = bandForGradeLabel(g);
    if (b < bands.length) {
      bands[b] += v;
    }
  }
  const values = bands.map((v) =>
    Number.isFinite(v) ? v : 0,
  ) as readonly number[];

  const total = values.reduce((a, b) => a + b, 0);

  const hasActive =
    Number.isFinite(activeItemIndex) &&
    activeItemIndex !== -1 &&
    values[activeItemIndex] > 0;

  const activeBandTotal = (() => {
    if (!hasActive) return total;
    return (values[activeItemIndex] ?? 0) as number;
  })();

  const gradesForBand = (band: number): readonly GradeLabel[] => {
    return allGrades.filter(
      (g) => bandForGradeLabel(g) === band,
    ) as readonly GradeLabel[];
  };

  const breakdown = (() => {
    if (!hasActive) return [] as { grade: GradeLabel; count: number }[];
    const grades = gradesForBand(activeItemIndex);
    const items: { grade: GradeLabel; count: number }[] = [];
    for (const g of grades) {
      const c = counts[g] ?? 0;
      if (c > 0) items.push({ grade: g, count: c });
    }
    return items;
  })();

  const gradeRange = (() => {
    const present = allGrades.filter(
      (g) => g !== PROJECT_GRADE_LABEL && (counts[g] ?? 0) > 0,
    );
    if (present.length === 0) return '';
    const first = present[0];
    const last = present[present.length - 1];
    return first === last ? `${first}` : `${first} – ${last}`;
  })();

  const breakdownText = (() => {
    if (!hasActive) return '';

    if (activeBandTotal < 500) {
      if (breakdown.length === 0) return '';
      return breakdown
        .map(
          (it) =>
            `<span class="whitespace-nowrap">${it.grade}:</> <b>${it.count}</b></span>`,
        )
        .join(' | ');
    }

    const grades = gradesForBand(activeItemIndex);
    const present = grades.filter((g) => (counts[g] ?? 0) > 0);
    if (present.length === 0) return '';
    const first = present[0];
    const last = present[present.length - 1];
    return first === last ? `${first}` : `${first} – ${last}`;
  })();

  return {
    values,
    total,
    hasActive,
    activeBandTotal,
    breakdown,
    gradeRange,
    breakdownText,
  };
}
