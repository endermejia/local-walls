import {
  GRADE_COLORS,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  GradeLabel,
  colorForGrade,
} from '../models';

export interface RouteStyleConfig {
  isSelected: boolean;
  isHovered?: boolean;
  color?: string;
  routeGrade?: string;
  baseStrokeWidth?: number;
}

export function getRouteColor(grade: string | number): string {
  const label = GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES];

  return colorForGrade(label as GradeLabel) || GRADE_COLORS[5];
}

export function getRouteStyleProperties(
  isSelected: boolean,
  isHovered: boolean,
  grade: string | number,
): { stroke: string; opacity: number; isDashed: boolean } {
  const finalColor = getRouteColor(grade);

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
 * Get the route style properties based on selected/hovered state.
 * Wraps `getRouteStyleProperties` with ID-based lookup.
 */
export function getRouteStyleForId(
  grade: string | number,
  routeId: string | number,
  selectedRouteId: string | number | null,
  hoveredRouteId: string | number | null = null,
): { stroke: string; opacity: number; isDashed: boolean } {
  const isSelected = selectedRouteId === routeId;
  const isHovered = hoveredRouteId === routeId;
  return getRouteStyleProperties(isSelected, isHovered, grade);
}
