/**
 * Convert a CSS length expressed in rem or px to device pixels (integer, rounded).
 * - On the server (no window/document), assumes 1rem = 16px.
 * - On the client, uses computed root font-size for precise conversion.
 */
export function remToPx(remOrPx: string): number {
  if (!remOrPx) return 0;
  const num = Number.parseFloat(remOrPx);
  if (Number.isNaN(num)) return 0;

  const isRem = remOrPx.trim().endsWith('rem');

  // SSR or environments without window/document
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const base = isRem ? 16 : 1;
    return Math.round(num * base);
  }

  if (isRem) {
    const rootFont = window.getComputedStyle(document.documentElement).fontSize;
    const base = Number.parseFloat(rootFont) || 16;
    return Math.round(num * base);
  }

  return Math.round(num);
}

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
  const letterVal = letter === 'a' ? 0 : letter === 'b' ? 1 : letter === 'c' ? 2 : 0;
  return base * 10 + letterVal + (plus ? 0.5 : 0);
}
