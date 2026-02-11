import {
  GRADE_COLORS,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
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

export function getRouteColor(
  color: string | undefined,
  grade: string,
): string {
  if (color) return color;
  return (
    colorForGrade(
      VERTICAL_LIFE_TO_LABEL[
        grade as unknown as VERTICAL_LIFE_GRADES
      ] as GradeLabel,
    ) || GRADE_COLORS[0]
  );
}

export function getRouteStyleProperties(
  isSelected: boolean,
  isHovered: boolean,
  color: string | undefined,
  grade: string,
): { stroke: string; opacity: number; isDashed: boolean } {
  const finalColor = getRouteColor(color, grade);

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
  baseWidth = 2,
  viewMode: 'editor' | 'viewer' = 'editor',
): number {
  if (viewMode === 'viewer') {
    if (isSelected) return 0.008;
    if (isHovered) return 0.007;
    return 0.005;
  }
  return isSelected ? baseWidth * 2 : baseWidth;
}
