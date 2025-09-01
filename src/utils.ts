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
