import {
  AscentType,
  GradeLabel,
  GRADE_NUMBER_TO_LABEL,
  PROJECT_GRADE_LABEL,
  VERTICAL_LIFE_GRADES,
} from '../models';
import {
  RouteScore,
  AscentTypeDistribution,
  GradeDistribution,
  TrendSourcePoint,
} from '../models/user-stats.model';
import { UserAscentStatRecord } from '../models/route-ascent.model';

/**
 * Calculates a score for a given grade and ascent type.
 * Base: 8a (29) = 1000. Step = 50.
 * Bonus: OS + 125 points, Flash + 60 points.
 * Requirement: 7c OS (900 + 125 = 1025) should score more than 8a RP (1000)
 * but less than 8a+ RP (1050).
 */
export function getScore(gradeId: number, type: AscentType | string): number {
  if (!gradeId) return 0;

  let bonus = 0;
  const t = type.toLowerCase();
  if (t === 'os' || t === 'onsight') bonus = 125;
  else if (t === 'f' || t === 'flash') bonus = 60;

  const baseScore = 1000 + (gradeId - 29) * 50;
  return Math.max(0, baseScore + bonus);
}

/**
 * Returns the maximum grade achieved for a specific set of ascent types.
 */
export function getMaxGrade(
  ascents: UserAscentStatRecord[],
  types: string[],
): string | null {
  let maxGradeId = -1;
  ascents.forEach((a) => {
    const type = (a.ascent_type || 'rp').toLowerCase();
    const typeMatches = types.some(
      (t) =>
        type === t.toLowerCase() ||
        (t === 'os' && type === 'onsight') ||
        (t === 'f' && type === 'flash'),
    );

    if (typeMatches) {
      const gradeId = a.ascent_grade || a.route_grade;
      if (gradeId && gradeId > maxGradeId) {
        maxGradeId = gradeId;
      }
    }
  });

  if (maxGradeId !== -1) {
    return GRADE_NUMBER_TO_LABEL[maxGradeId as VERTICAL_LIFE_GRADES] || null;
  }
  return null;
}

/**
 * Maps a single ascent record to a RouteScore object.
 */
export function mapAscentToRouteScore(
  a: UserAscentStatRecord,
): RouteScore | null {
  let gradeId = a.ascent_grade;
  if (!gradeId && a.route_grade) gradeId = a.route_grade;
  const name = a.route_name || 'Unknown Route';

  if (!gradeId) return null;

  return {
    name,
    gradeLabel:
      GRADE_NUMBER_TO_LABEL[gradeId as VERTICAL_LIFE_GRADES] ||
      PROJECT_GRADE_LABEL,
    gradeId: gradeId as number,
    score: getScore(gradeId, (a.ascent_type || 'rp') as AscentType),
    type: (a.ascent_type || 'rp') as AscentType,
    areaSlug: a.area_slug || '',
    cragSlug: a.crag_slug || '',
    routeSlug: a.route_slug || '',
  };
}

/**
 * Calculates total score and top routes for a set of ascents.
 * Uses top 10 scoring routes.
 */
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

/**
 * Filters ascents by a date range string (e.g., 'last_12_months', 'last_6_months', 'this_year', or a four-digit year).
 */
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

/**
 * Calculates the distribution of ascents by type (Onsight, Flash, RP).
 */
export function calculateAscentTypeDistribution(
  ascents: UserAscentStatRecord[],
): AscentTypeDistribution {
  let os = 0,
    flash = 0,
    rp = 0;

  ascents.forEach((a) => {
    const type = (a.ascent_type || 'rp').toLowerCase();
    if (type === 'os' || type === 'onsight') os++;
    else if (type === 'f' || type === 'flash') flash++;
    else rp++;
  });

  return { os, flash, rp, total: ascents.length };
}

/**
 * Groups ascents into grade buckets for pyramid/distribution charts.
 */
export function calculateGradeDistribution(
  ascents: UserAscentStatRecord[],
  limit?: number,
): GradeDistribution {
  if (ascents.length === 0) {
    return { rows: [], total: 0, maxCount: 0, hasMore: false };
  }

  const buckets = new Map<
    number,
    {
      os: number;
      flash: number;
      rp: number;
      total: number;
      label: GradeLabel;
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

  if (buckets.size === 0) {
    return { rows: [], total: 0, maxCount: 0, hasMore: false };
  }

  // Sort Descending (Highest Grade Top)
  const sortedGradeIds = Array.from(buckets.keys()).sort((a, b) => b - a);
  const hasMore = limit ? sortedGradeIds.length > limit : false;
  const topGrades = limit ? sortedGradeIds.slice(0, limit) : sortedGradeIds;

  let maxBucketCount = 0;
  const rows = topGrades.map((id) => {
    const b = buckets.get(id)!;
    if (b.total > maxBucketCount) maxBucketCount = b.total;

    // Filter and sort routes for each category
    const osRoutes = b.routes
      .filter((r) => r.type === 'os')
      .sort((x, y) => y.score - x.score);
    const flashRoutes = b.routes
      .filter((r) => r.type === 'f')
      .sort((x, y) => y.score - x.score);
    const rpRoutes = b.routes
      .filter((r) => r.type !== 'os' && r.type !== 'f')
      .sort((x, y) => y.score - x.score);

    const allRoutes = [...osRoutes, ...flashRoutes, ...rpRoutes].sort(
      (x, y) => y.score - x.score,
    );

    return {
      gradeLabel: b.label,
      os: b.os,
      flash: b.flash,
      rp: b.rp,
      total: b.total,
      osRoutes,
      flashRoutes,
      rpRoutes,
      allRoutes,
    };
  });

  return { rows, total: totalAscents, maxCount: maxBucketCount, hasMore };
}

/**
 * Processes ascents to generate yearly trend data points.
 */
export function calculateTrendSource(
  stats: UserAscentStatRecord[],
  todayLabel: string,
): TrendSourcePoint[] {
  if (stats.length === 0) return [];

  const ascentsByYear = new Map<string, UserAscentStatRecord[]>();
  const currentYear = new Date().getFullYear();
  let minYear = currentYear;

  stats.forEach((ascent: UserAscentStatRecord) => {
    const dateStr = ascent.ascent_date;
    if (!dateStr) return;
    const year = new Date(dateStr).getFullYear();
    const yearStr = year.toString();

    if (year < minYear) minYear = year;
    if (!ascentsByYear.has(yearStr)) ascentsByYear.set(yearStr, []);
    ascentsByYear.get(yearStr)?.push(ascent);
  });

  const dataPoints: TrendSourcePoint[] = [];

  // 1. Yearly Data (up to currentYear - 1)
  for (let y = minYear; y < currentYear; y++) {
    const yearStr = y.toString();
    const ascents = ascentsByYear.get(yearStr) || [];
    dataPoints.push({
      label: yearStr,
      ...calculatePeriodScore(ascents),
    });
  }

  // 2. 'Today' Data (Last 12 Months)
  const now = new Date();
  const last12MonthsShortDate = new Date();
  last12MonthsShortDate.setFullYear(now.getFullYear() - 1);

  // Filter raw stats for last 12 months
  const last12MonthsAscents = stats.filter((a: UserAscentStatRecord) => {
    const d = new Date(a.ascent_date);
    return d >= last12MonthsShortDate && d <= now;
  });

  dataPoints.push({
    label: todayLabel,
    ...calculatePeriodScore(last12MonthsAscents),
  });

  return dataPoints;
}
