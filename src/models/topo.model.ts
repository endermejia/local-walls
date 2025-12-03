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
  photo?: string;
  cragId: string;
  grades: AmountByEveryGrade;
  topoRoutes: TopoRoute[];
}

export interface TopoListItem {
  id: number;
  name: string;
  slug: string;
  photo?: string;
  grades: AmountByEveryGrade;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
}
