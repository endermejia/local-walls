import type { RoutesByGrade, ClimbingRoute } from '../models';

/**
 * Grade ranking utility for sorting French sport grades like "6a+", "7b", "5c".
 * Returns a numeric rank where higher means harder. Invalid/unknown grades get +Infinity
 * so they appear at the end when sorted ascending.
 * Examples:
 *  - 6a  -> 60
 *  - 6a+ -> 60.5
 *  - 6b  -> 61
 *  - 7c+ -> 72.5
 */
export function gradeRank(grade?: string): number {
  if (!grade) return Number.POSITIVE_INFINITY;
  const m = /^\s*(\d)\s*([a-cA-C])?\s*(\+)?\s*$/i.exec(grade);
  if (!m) return Number.POSITIVE_INFINITY;
  const base = parseInt(m[1], 10);
  const letter = (m[2] || '').toLowerCase();
  const plus = !!m[3];
  const letterVal =
    letter === 'a' ? 0 : letter === 'b' ? 1 : letter === 'c' ? 2 : 0;
  return base * 10 + letterVal + (plus ? 0.5 : 0);
}
