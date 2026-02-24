import { TuiPoint } from '@taiga-ui/core/types';
import {
  AscentType,
  GRADE_NUMBER_TO_LABEL,
  UserAscentStatRecord,
  VERTICAL_LIFE_GRADES,
} from '../models';

export interface RouteScore {
  name: string;
  gradeLabel: string;
  gradeId?: number;
  score: number;
  type: AscentType;
  areaSlug: string;
  cragSlug: string;
  routeSlug: string;
}

export interface GradeDistributionRow {
  gradeLabel: string;
  os: number;
  flash: number;
  rp: number;
  total: number;
  osRoutes: RouteScore[];
  flashRoutes: RouteScore[];
  rpRoutes: RouteScore[];
}

export interface GradeDistributionResult {
  rows: GradeDistributionRow[];
  total: number;
  maxCount: number;
  hasMore: boolean;
}

export interface TrendDataResult {
  years: string[];
  series: TuiPoint[];
  maxY: number;
  minY: number;
  sourceData: {
    label: string;
    score: number;
    topRoutes: RouteScore[];
  }[];
}

// Scoring Helpers
export function getScore(gradeId: number, type: AscentType): number {
  // Base: 8a (29) = 1000. Step = 50.
  // Bonus: OS + 2 steps (100), Flash + 1 step (50).
  let bonus = 0;
  if (type === 'os') bonus = 100;
  else if (type === 'f') bonus = 50;

  // Calculate base score relative to 8a
  // 8a is index 29 in VERTICAL_LIFE_GRADES
  const baseScore = 1000 + (gradeId - 29) * 50;

  return baseScore + bonus;
}

export function getMaxGrade(
  ascents: UserAscentStatRecord[],
  types: string[],
  gradeMap: typeof GRADE_NUMBER_TO_LABEL = GRADE_NUMBER_TO_LABEL,
): string | null {
  let maxGradeId = -1;
  ascents.forEach((a) => {
    const type = (a.ascent_type || 'rp').toLowerCase();
    if (types.includes(type)) {
      const gradeId = a.ascent_grade || a.route_grade;
      if (gradeId && gradeId > maxGradeId) {
        maxGradeId = gradeId;
      }
    }
  });

  if (maxGradeId !== -1) {
    return gradeMap[maxGradeId as VERTICAL_LIFE_GRADES] || null;
  }
  return null;
}

export function filterAscentsByDate(
  ascents: UserAscentStatRecord[],
  filter: string,
): UserAscentStatRecord[] {
  if (!filter || filter === 'all_time') return ascents;

  const now = new Date();
  let cutOff = new Date(0); // Epoch

  if (filter === 'last_12_months') {
    cutOff = new Date();
    cutOff.setFullYear(now.getFullYear() - 1);
  } else if (filter === 'last_6_months') {
    cutOff = new Date();
    cutOff.setMonth(now.getMonth() - 6);
  } else if (filter === 'this_year') {
    cutOff = new Date(now.getFullYear(), 0, 1);
  } else if (/^\d{4}$/.test(filter)) {
    // Specific Year
    const y = parseInt(filter, 10);
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59);
    return ascents.filter((a: UserAscentStatRecord) => {
      const d = new Date(a.ascent_date);
      return d >= start && d <= end;
    });
  }

  return ascents.filter(
    (a: UserAscentStatRecord) => new Date(a.ascent_date) >= cutOff,
  );
}

export function mapAscentToRouteScore(
  a: UserAscentStatRecord,
  gradeMap: typeof GRADE_NUMBER_TO_LABEL = GRADE_NUMBER_TO_LABEL,
): RouteScore | null {
  let gradeId = a.ascent_grade;
  if (!gradeId && a.route_grade) gradeId = a.route_grade;
  const name = a.route_name || 'Unknown Route';

  if (!gradeId) return null;

  return {
    name,
    gradeLabel: gradeMap[gradeId as VERTICAL_LIFE_GRADES] || '?',
    gradeId: gradeId as number,
    score: getScore(gradeId, (a.ascent_type || 'rp') as AscentType),
    type: (a.ascent_type || 'rp') as AscentType,
    areaSlug: a.area_slug || '',
    cragSlug: a.crag_slug || '',
    routeSlug: a.route_slug || '',
  };
}

export function calculatePeriodScore(ascents: UserAscentStatRecord[]): {
  score: number;
  topRoutes: RouteScore[];
} {
  const validAscents = ascents
    .map((a) => mapAscentToRouteScore(a))
    .filter((a): a is RouteScore => a !== null && a.score > 0);

  validAscents.sort((a, b) => b.score - a.score);
  const top10 = validAscents.slice(0, 10);
  const totalScore = top10.reduce(
    (sum: number, a: RouteScore) => sum + a.score,
    0,
  );

  return { score: totalScore, topRoutes: top10 };
}

export function calculateAscentTypeDistribution(
  ascents: UserAscentStatRecord[],
) {
  let os = 0,
    flash = 0,
    rp = 0;

  ascents.forEach((a) => {
    const type = (a.ascent_type || 'rp').toLowerCase();
    if (type === 'os' || type === 'onsight') os++;
    else if (type === 'f' || type === 'flash') flash++;
    else rp++;
  });

  return {
    os,
    flash,
    rp,
    total: ascents.length,
  };
}

export function calculateGradeDistribution(
  ascents: UserAscentStatRecord[],
  showAllGrades: boolean,
): GradeDistributionResult {
  if (ascents.length === 0)
    return { rows: [], total: 0, maxCount: 0, hasMore: false };

  const buckets = new Map<
    number,
    {
      os: number;
      flash: number;
      rp: number;
      total: number;
      label: string;
      routes: RouteScore[];
    }
  >();

  let totalAscents = 0;

  ascents.forEach((ascent: UserAscentStatRecord) => {
    const routeScore = mapAscentToRouteScore(ascent);
    if (!routeScore) return;
    const gradeId = routeScore.gradeId!;

    if (!buckets.has(gradeId)) {
      buckets.set(gradeId, {
        os: 0,
        flash: 0,
        rp: 0,
        total: 0,
        label: routeScore.gradeLabel,
        routes: [],
      });
    }

    const bucket = buckets.get(gradeId)!;
    bucket.total++;
    totalAscents++;

    bucket.routes.push(routeScore);

    const type = (ascent.ascent_type || 'rp').toLowerCase();
    if (type === 'os' || type === 'onsight') bucket.os++;
    else if (type === 'f' || type === 'flash') bucket.flash++;
    else bucket.rp++;
  });

  if (buckets.size === 0)
    return { rows: [], total: 0, maxCount: 0, hasMore: false };

  const sortedGradeIds = Array.from(buckets.keys()).sort((a, b) => b - a);

  const hasMore = sortedGradeIds.length > 8;
  const topGrades = showAllGrades
    ? sortedGradeIds
    : sortedGradeIds.slice(0, 8);

  let maxBucketCount = 0;
  const rows = topGrades.map((id) => {
    const b = buckets.get(id)!;
    if (b.total > maxBucketCount) maxBucketCount = b.total;

    const osRoutes = b.routes
      .filter((r) => r.type === 'os')
      .sort((x, y) => y.score - x.score);
    const flashRoutes = b.routes
      .filter((r) => r.type === 'f')
      .sort((x, y) => y.score - x.score);
    const rpRoutes = b.routes
      .filter((r) => r.type !== 'os' && r.type !== 'f')
      .sort((x, y) => y.score - x.score);

    return {
      gradeLabel: b.label,
      os: b.os,
      flash: b.flash,
      rp: b.rp,
      total: b.total,
      osRoutes,
      flashRoutes,
      rpRoutes,
    };
  });

  return { rows, total: totalAscents, maxCount: maxBucketCount, hasMore };
}

export function calculateTrendData(
  ascents: UserAscentStatRecord[],
  width: number,
  height: number,
  todayLabel: string,
): TrendDataResult {
  if (ascents.length === 0)
    return {
      years: [],
      series: [],
      maxY: 0,
      minY: 0,
      sourceData: [],
    };

  const ascentsByYear = new Map<string, UserAscentStatRecord[]>();
  const currentYear = new Date().getFullYear();
  let minYear = currentYear;

  ascents.forEach((ascent: UserAscentStatRecord) => {
    const dateStr = ascent.ascent_date;
    if (!dateStr) return;
    const year = new Date(dateStr).getFullYear();
    const yearStr = year.toString();

    if (year < minYear) minYear = year;
    if (!ascentsByYear.has(yearStr)) ascentsByYear.set(yearStr, []);
    ascentsByYear.get(yearStr)?.push(ascent);
  });

  const dataPoints: {
    label: string;
    score: number;
    topRoutes: RouteScore[];
  }[] = [];

  for (let y = minYear; y < currentYear; y++) {
    const yearStr = y.toString();
    const yearAscents = ascentsByYear.get(yearStr) || [];
    dataPoints.push({
      label: yearStr,
      ...calculatePeriodScore(yearAscents),
    });
  }

  const now = new Date();
  const last12MonthsShortDate = new Date();
  last12MonthsShortDate.setFullYear(now.getFullYear() - 1);

  const last12MonthsAscents = ascents.filter((a: UserAscentStatRecord) => {
    const d = new Date(a.ascent_date);
    return d >= last12MonthsShortDate && d <= now;
  });

  dataPoints.push({
    label: todayLabel,
    ...calculatePeriodScore(last12MonthsAscents),
  });

  const years = dataPoints.map((d) => d.label);
  const scores = dataPoints.map((d) => d.score);
  const realMin = Math.min(...scores);
  const realMax = Math.max(...scores);

  const range = realMax - realMin;
  const safeRange = range === 0 ? realMin * 0.1 || 100 : range;

  let domMin = Math.floor(realMin - safeRange * 0.2);
  if (domMin < 0) domMin = 0;

  const domMax = Math.ceil(realMax + safeRange * 0.1);
  const domRange = domMax - domMin;

  const series: TuiPoint[] = [];
  const xStep = years.length > 1 ? width / (years.length - 1) : 0;

  scores.forEach((score, index) => {
    const x = years.length > 1 ? index * xStep : width / 2;
    const y = ((score - domMin) / domRange) * height;
    series.push([x, y]);
  });

  return {
    years,
    series,
    maxY: domMax,
    minY: domMin,
    sourceData: dataPoints,
  };
}

export function calculateTrendYLabels(
  minY: number,
  maxY: number,
  count: number = 5,
): string[] {
  const labels: string[] = [];
  const step = (maxY - minY) / (count - 1 || 1);

  for (let i = 0; i < count; i++) {
    labels.push(Math.round(minY + i * step).toString());
  }
  return labels;
}
