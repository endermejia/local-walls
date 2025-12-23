import { AmountByEveryGrade } from './grade.model';

export interface TopoRoute {
  id: number;
  routeId: number;
  orderNumber: number;
}

export interface ClimbingTopo {
  id: number;
  slug: string;
  name: string;
  photo?: string | null;
  cragId: string;
  grades: AmountByEveryGrade;
  topoRoutes: TopoRoute[];
}

export interface TopoListItem {
  id: number;
  name: string;
  slug: string;
  photo?: string | null;
  grades: AmountByEveryGrade;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
}
