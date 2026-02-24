export function getPointsString(
  points: { x: number; y: number }[],
  scaleX = 1,
  scaleY = 1,
): string {
  if (!points || points.length === 0) return '';
  return points
    .map((p) => `${p.x * scaleX},${p.y * scaleY}`)
    .join(' ');
}
