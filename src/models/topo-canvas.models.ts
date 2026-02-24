export interface TopoCanvasRoute {
  id: number;
  points: { x: number; y: number }[];
  color: string;
  grade: string | number;
  name: string;
}

export type TopoViewMode = 'viewer' | 'editor';
