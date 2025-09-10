// TODO: Pending AdditionApi
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
  topoRoutes: TopoRoute[];
}
