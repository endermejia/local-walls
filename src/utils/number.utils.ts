export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function progressPercent(completed: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.floor((completed / total) * 100));
}
