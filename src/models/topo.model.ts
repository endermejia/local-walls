// TODO: Pending AdditionApi
import { AmountByEveryVerticalLifeGrade } from './grade.model';

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
  grades: AmountByEveryVerticalLifeGrade;
  topoRoutes: TopoRoute[];
}
