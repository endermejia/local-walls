import {
  GRADE_COLORS,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  GradeLabel,
  PointState,
  TopoPath,
  colorForGrade,
} from '../models';

export const POINT_STATE_COLORS: Record<
  Exclude<PointState, 'neutral'>,
  string
> = {
  start: '#22C55E',
  top: '#EF4444',
  match: '#3B82F6',
  foot: '#EAB308',
};

export function getPointStateColor(
  state?: PointState,
  defaultColor = '#FFFFFF',
): string {
  if (!state || state === 'neutral') {
    return defaultColor;
  }
  return POINT_STATE_COLORS[state] ?? defaultColor;
}

export function getPointStateBadge(state?: PointState): string {
  switch (state) {
    case 'start':
      return 'S';
    case 'top':
      return 'T';
    case 'match':
      return 'M';
    case 'foot':
      return 'F';
    default:
      return '';
  }
}

export function getPointStateLabel(state?: PointState): string {
  switch (state) {
    case 'start':
      return 'START';
    case 'top':
      return 'TOP';
    case 'match':
      return 'MATCH';
    case 'foot':
      return 'FOOT';
    default:
      return '';
  }
}

export function cyclePointState(currentState?: PointState): PointState {
  switch (currentState) {
    case 'start':
      return 'top';
    case 'top':
      return 'match';
    case 'match':
      return 'foot';
    case 'foot':
      return 'neutral';
    case 'neutral':
    default:
      return 'start';
  }
}

export function getRouteColor(
  grade: string | number | null | undefined,
): string {
  if (
    grade === null ||
    grade === undefined ||
    grade === 0 ||
    grade === '0' ||
    grade === '?'
  ) {
    return GRADE_COLORS[5];
  }

  const label = GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? grade;
  return colorForGrade(label as GradeLabel) || GRADE_COLORS[5];
}

export function getRouteStyleProperties(
  isSelected: boolean,
  isHovered: boolean,
  grade: string | number | null | undefined,
  customColor?: string | null,
): { stroke: string; opacity: number; isDashed: boolean } {
  const isZero =
    grade === null ||
    grade === undefined ||
    grade === 0 ||
    grade === '0' ||
    grade === '?';

  const isValidCustomColor =
    customColor &&
    customColor !== 'var(--tui-background-accent-opposite)' &&
    customColor !== '#000000' &&
    customColor !== '#000' &&
    customColor !== 'black';

  const finalColor = isZero
    ? GRADE_COLORS[5]
    : isValidCustomColor
      ? customColor
      : getRouteColor(grade);

  // Opacity: Selected/Hovered = 1, Default = 0.8
  const opacity = isSelected || isHovered ? 1 : 0.8;

  // Dash: Selected/Hovered = Solid, Default = Dashed
  const isDashed = !isSelected && !isHovered;

  return {
    stroke: finalColor,
    opacity,
    isDashed,
  };
}

export function getRouteStrokeWidth(
  isSelected: boolean,
  isHovered: boolean,
  baseWidth = 5,
  viewMode: 'editor' | 'viewer' = 'editor',
  customWidth?: number,
): number {
  const width = customWidth || baseWidth;
  const factor = width / 1000;

  if (viewMode === 'viewer') {
    if (isSelected) return factor * 1.6;
    if (isHovered) return factor * 1.4;
    return factor;
  }

  // In editor mode, we return the factor to be multiplied by the image width
  return isSelected ? factor * 1.6 : factor;
}

/**
 * Convert a list of normalized points (0-1) to an SVG points string
 * with optional scale factors.
 */
export function getPointsString(
  points: { x: number; y: number }[],
  scaleX = 1,
  scaleY = 1,
): string {
  return points.map((p) => `${p.x * scaleX},${p.y * scaleY}`).join(' ');
}

/**
 * Check whether a route has a non-empty path in the given paths map.
 */
export function hasPath(
  routeId: string | number,
  pathsMap: Map<string | number, { points: { x: number; y: number }[] }>,
): boolean {
  const pathData = pathsMap.get(routeId);
  return !!pathData && pathData.points.length > 0;
}

/**
 * Calculates the number of moves for a route's path.
 * - Points with state 'start' or 'foot' count as 0 moves.
 * - Points with state 'match' count as 2 moves.
 * - Any other points (neutral, top, or unspecified) count as 1 move.
 */
export function calculateRouteMoves(path?: TopoPath | null): number {
  if (!path?.points || path.points.length === 0) return 0;
  return path.points.reduce((acc, pt) => {
    if (pt.state === 'start' || pt.state === 'foot') return acc;
    if (pt.state === 'match') return acc + 2;
    return acc + 1;
  }, 0);
}
