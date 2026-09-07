import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiSortDirection } from '@taiga-ui/addon-table';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import {
  RouteItem,
  RoutesTableRow,
  RouteAscentWithExtras,
  AscentType,
  RoutesTableKey,
  IndoorRouteWithExtras,
} from '../../models';

import { mapRouteToTableRow, handleErrorToast } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { RouteRowExpandedComponent } from './route-row-expanded';
import { RoutesTableComponent } from './routes-table';

@Component({
  selector: 'app-outdoor-routes-table',
  imports: [
    CommonModule,
    TranslateModule,
    RoutesTableComponent,
    RouteRowExpandedComponent,
  ],
  template: `
    <app-routes-table
      [data]="mappedData()"
      [columns]="columns()"
      [direction]="direction()"
      [activeCol]="activeCol()"
      [showRowColors]="showRowColors()"
      [expandableMobile]="expandableMobile()"
      [showAddRouteToTopo]="showAddRouteToTopo()"
      [availableTopos]="availableTopos()"
      [ascentInfo]="ascentsService.ascentInfo()"
      [isMobile]="layoutService.isMobile()"
      [expandedTemplate]="expandedTpl"
      (updateRouteHeight)="onUpdateRouteHeight($event.row, $event.height)"
      (toggleRouteOnTopo)="
        toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
      "
      (logAscent)="onLogAscent($event)"
      (viewAscent)="onViewAscent($event.row, $event.ascent)"
      (toggleProject)="onToggleProject($event)"
      (editRoute)="openEditRoute($event)"
      (deleteRoute)="deleteRoute($event)"
    />

    <ng-template #expandedTpl let-item>
      <app-route-row-expanded
        [route]="item"
        [showAdminActions]="showAdminActions()"
        [showLocation]="showLocation()"
        [showAddRouteToTopo]="showAddRouteToTopo()"
        [availableTopos]="availableTopos()"
        (logAscent)="onLogAscent($event)"
        (viewAscent)="onViewAscent($event.route, $event.own_ascent)"
        (toggleProject)="onToggleProject($event)"
        (editRoute)="openEditRoute($event)"
        (deleteRoute)="deleteRoute($event)"
        (toggleRouteOnTopo)="
          toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
        "
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutdoorRoutesTableComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly authState = inject(AuthStateService);
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly routesService = inject(RoutesService);
  protected readonly toposService = inject(ToposService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly router = inject(Router);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  // Inputs
  data = input<RouteItem[]>([]);
  showLocation = input(false);
  showAdminActions = input(true);
  showRowColors = input(true);
  expandableMobile = input(true);
  showAddRouteToTopo = input(false);
  hiddenColumns = input<string[]>([]);
  activeCol = input<RoutesTableKey>('ascents');
  direction = input<TuiSortDirection>(TuiSortDirection.Desc);

  protected readonly mappedData = computed(() => {
    const isAsAdmin = this.authState.canEditAsAdmin();
    const areaAdminMap = this.authState.areaAdminPermissions();

    return this.data().map((r) => {
      const row = mapRouteToTableRow(r);
      const canEdit = this.authState.checkRouteEditPermission(r);
      row.canEdit = canEdit;
      row.canDelete = isAsAdmin || !!areaAdminMap[r.area_id || -1];
      row.canAddTopo = canEdit;
      return row;
    });
  });

  protected readonly columns = computed(() => {
    const cols = [
      'grade',
      'route',
      'topo',
      'height',
      'rating',
      'ascents',
      'actions',
    ];

    const canEditAny = this.data().some((r) =>
      this.authState.checkRouteEditPermission(r),
    );

    if (
      this.authState.editingMode() &&
      this.showAdminActions() &&
      (this.authState.canEditAsAdmin() || canEditAny)
    ) {
      cols.push('admin_actions');
    }

    return cols.filter((c) => !this.hiddenColumns().includes(c));
  });

  protected readonly availableTopos = computed(() => {
    const crag = this.outdoorData.cragDetail();
    if (!crag || !crag.topos) return [];
    return crag.topos.map((t) => ({ id: t.id, name: t.name }));
  });

  protected onUpdateRouteHeight(
    row: RoutesTableRow,
    newHeight: number | string | null,
  ): void {
    const r = row._ref as RouteItem;
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;

    if (val === r.height) return;

    this.routesService
      .update(r.id, { height: val })
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected async toggleRouteOnTopo(
    topoId: number | string,
    routeId: number | string,
    isPresent: boolean,
  ): Promise<void> {
    const tid = typeof topoId === 'string' ? parseInt(topoId, 10) : topoId;
    const rid = typeof routeId === 'string' ? parseInt(routeId, 10) : routeId;
    try {
      if (isPresent) {
        await this.toposService.removeRoute(tid, rid, false);
      } else {
        await this.toposService.addRoute(
          {
            topo_id: tid,
            route_id: rid,
            number: 0,
          },
          false,
        );
      }
      await this.cragRoutesData.cragRoutesResource.reload();
      await this.outdoorData.cragDetailResource.reload();
    } catch (e: unknown) {
      console.error('[OutdoorRoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }

  protected async onLogAscent(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r = '_ref' in item ? (item._ref as RouteItem) : (item as RouteItem);
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        grade: r.grade,
        climbingKind: r.climbing_kind,
      }),
      { defaultValue: undefined },
    );
  }

  protected onViewAscent(
    _row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
    ascent:
      RouteAscentWithExtras | { id: string | number; type: AscentType | null },
  ): void {
    this.ascentsService.viewAscent(ascent.id);
  }

  protected onToggleProject(item: RoutesTableRow): void {
    const r = item._ref as RouteItem;
    this.routesService.toggleRouteProject(r.id, r);
  }

  protected openEditRoute(
    row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): void {
    const r = '_ref' in row ? (row._ref as RouteItem) : (row as RouteItem);
    this.routesService.openRouteForm({
      cragId: r.crag_id,
      routeData: {
        id: r.id,
        crag_id: r.crag_id,
        name: r.name,
        slug: r.slug,
        grade: Number(r.grade),
        climbing_kind: r.climbing_kind,
        height: r.height || null,
      },
    });
  }

  protected deleteRoute(
    row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): void {
    if (!this.isBrowser) return;
    const r = '_ref' in row ? (row._ref as RouteItem) : (row as RouteItem);

    firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(r.id)
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }
}
