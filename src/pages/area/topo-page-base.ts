import {
  computed,
  Directive,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/core';
import {
  TuiSortDirection,
  type TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TranslateService } from '@ngx-translate/core';
import { AscentsService } from '../../services/ascents.service';
import { GlobalData } from '../../services/global-data';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';
import { IndoorService } from '../../services/indoor.service';
import type { TopoRouteRow } from '../../components/topo/topo.types';
import type { TopoDetail, TopoListItem } from '../../models';
import {
  getRouteStyleProperties,
  getRouteStrokeWidth,
  getPointsString as getPointsStringUtil,
} from '../../utils/topo-styles.utils';

@Directive()
export abstract class TopoPageBase implements OnDestroy {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly toposService = inject(ToposService);
  protected readonly indoorService = inject(IndoorService);
  protected readonly routesService = inject(RoutesService);
  protected readonly router = inject(Router);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly toast = inject(ToastService);

  abstract isIndoor: Signal<boolean>;

  countrySlug = input<string | undefined>(undefined);
  areaSlug = input<string | undefined>(undefined);
  cragSlug = input<string | undefined>(undefined);
  centerSlug = input<string | undefined>(undefined);
  id = input<string | undefined>();
  sectorSlug = input<string | undefined>();

  protected readonly topo = this.global.topoDetailResource.value;
  protected readonly crag = this.global.cragDetailResource.value;
  protected readonly allAreaTopos = this.global.areaToposResource.value;

  protected readonly selectedRouteId = signal<string | number | null>(null);
  protected readonly hoveredRouteId = signal<string | number | null>(null);

  protected readonly selectedRouteInfo = computed(() => {
    const routeId = this.selectedRouteId();
    const topo = this.topo();
    if (!routeId || !topo || !topo.topo_routes) return null;
    return topo.topo_routes.find((r) => r?.route_id === routeId) || null;
  });

  protected readonly imageRatio = signal(1);

  protected readonly renderedTopoRoutes = computed(() => {
    const t = this.topo();
    if (!t) return [];
    const selectedId = this.selectedRouteId();
    const hoveredId = this.hoveredRouteId();
    const ratio = this.imageRatio();
    const hScale = 1000 / ratio;
    const routes = [...t.topo_routes];
    routes.sort((a, b) => {
      const getPriority = (id: string | number) => {
        if (id === selectedId) return 2;
        if (id === hoveredId) return 1;
        return 0;
      };
      return getPriority(a.route_id) - getPriority(b.route_id);
    });
    return routes.map((tr) => {
      const isSelected = tr.route_id === selectedId;
      const isHovered = tr.route_id === hoveredId;
      const style = getRouteStyleProperties(
        isSelected,
        isHovered,
        tr.route.grade,
      );
      const width = getRouteStrokeWidth(
        isSelected,
        isHovered,
        5,
        'viewer',
        tr.path?.width,
      );
      const pointsString = tr.path
        ? getPointsStringUtil(tr.path.points, 1000, hScale)
        : '';
      return { ...tr, style, width, pointsString };
    });
  });

  protected readonly sortedAreaTopos = computed(() => {
    const topos = this.allAreaTopos() || [];
    return [...topos].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<TopoRouteRow>>(() => 0);

  constructor() {
    effect(() => {
      const t = this.topo();
      if (this.isIndoor() && t) {
        this.global.selectedIndoorCenter.set({
          id: t.center_id || '',
          name: t.crag?.name || '',
          slug: t.crag?.slug || '',
        } as never);
      }
    });

    effect(() => {
      this.global.resetDataByPage('topo');
      const topoId = this.id();
      if (this.isIndoor()) {
        const center = this.centerSlug();
        this.global.selectedCenterSlug.set(center || null);
        this.global.selectedAreaSlug.set(null);
        this.global.selectedCragSlug.set(null);
      } else {
        const aSlug = this.areaSlug();
        const cSlug = this.cragSlug();
        this.global.selectedAreaSlug.set(aSlug || null);
        this.global.selectedCragSlug.set(cSlug || null);
        this.global.selectedCenterSlug.set(null);
      }
      if (topoId) {
        this.global.selectedTopoId.set(topoId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.isIndoor()) {
      this.global.selectedIndoorCenter.set(null);
    }
  }

  protected onSortChange(sort: TuiTableSortChange<TopoRouteRow>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || (() => 0));
  }

  protected navigateToTopo(
    topo: TopoDetail | (TopoListItem & { crag_slug: string }),
  ): void {
    if (this.isIndoor()) {
      void this.router.navigate([
        '/indoor',
        this.centerSlug()!,
        'topo',
        topo.id,
      ]);
    } else {
      void this.router.navigate([
        '/area',
        this.areaSlug()!,
        this.cragSlug()!,
        'topo',
        topo.id,
      ]);
    }
  }
}
