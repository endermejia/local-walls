import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { AscentsService } from '../../services/ascents.service';
import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';

import { RoutesTableComponent } from './routes-table';
import { IndoorRouteEquippersInputComponent } from './indoor-route-equippers-input';
import { RouteRowExpandedComponent } from './route-row-expanded';

import { RouterLink } from '@angular/router';
import { TuiLink } from '@taiga-ui/core';

import {
  IndoorRouteWithExtras,
  RoutesTableRow,
  RouteAscentWithExtras,
  AscentType,
  RouteItem,
} from '../../models';
import { mapRouteToTableRow, handleErrorToast } from '../../utils';

@Component({
  selector: 'app-indoor-routes-table',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RoutesTableComponent,
    IndoorRouteEquippersInputComponent,
    RouteRowExpandedComponent,
    RouterLink,
    TuiLink,
  ],
  template: `
    <app-routes-table
      [data]="mappedData()"
      [columns]="columns()"
      [showAddRouteToTopo]="true"
      [availableTopos]="availableTopos()"
      [ascentInfo]="ascentsService.ascentInfo()"
      [isMobile]="global.isMobile()"
      [equippersTemplate]="equippersTpl"
      [expandedTemplate]="expandedTpl"
      (logAscent)="logIndoorAscent($event)"
      (editAscent)="editIndoorAscent($event.row, $event.ascent)"
      (editRoute)="editIndoorRoute($event)"
      (deleteRoute)="deleteIndoorRoute($event)"
      (toggleRouteOnTopo)="
        toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
      "
    />

    <ng-template #equippersTpl let-item>
      @if (canEditIndoor()) {
        <app-indoor-route-equippers-input
          [route]="indoorRefMap()[item.id]"
          (equippersChanged)="indoorService.reloadCenterRoutes()"
        />
      } @else {
        <div class="flex flex-wrap gap-1 items-center">
          @for (e of item.equippers; track e.id) {
            <a
              tuiLink
              class="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
              [routerLink]="['/equipper', e.id]"
            >
              {{ e.name }}
            </a>
          } @empty {
            <span class="opacity-50 text-xs">-</span>
          }
        </div>
      }
    </ng-template>

    <ng-template #expandedTpl let-item>
      <app-route-row-expanded
        [route]="item"
        [showAdminActions]="true"
        [showLocation]="false"
        [showAddRouteToTopo]="true"
        [availableTopos]="availableTopos()"
        (logAscent)="logIndoorAscent($event)"
        (editAscent)="editIndoorAscent($event.route, $event.own_ascent)"
        (editRoute)="editIndoorRoute($event)"
        (deleteRoute)="deleteIndoorRoute($event)"
        (toggleRouteOnTopo)="
          toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
        "
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRoutesTableComponent {
  protected readonly global = inject(GlobalData);
  protected readonly indoorService = inject(IndoorService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  data = input<IndoorRouteWithExtras[]>([]);
  centerId = input<string | undefined>();
  centerSlug = input<string | undefined>();
  availableTopos = input<{ id: number | string; name: string }[]>([]);

  protected canEditIndoor(): boolean {
    const cid = this.centerId();
    if (!cid) return false;
    return !!this.global.indoorAdminPermissions()[cid];
  }

  protected readonly mappedData = computed(() => {
    const isEdit = this.canEditIndoor();
    const slug = this.centerSlug();
    return this.data().map((r) => {
      const route = slug ? { ...r, center_slug: slug } : r;
      const row = mapRouteToTableRow(route);
      row.canEdit = isEdit;
      row.canDelete = isEdit;
      row.canAddTopo = isEdit;
      return row;
    });
  });

  protected readonly indoorRefMap = computed(() => {
    const map: Record<string, IndoorRouteWithExtras> = {};
    for (const r of this.data()) {
      map[String(r.id)] = r;
    }
    return map;
  });

  protected readonly columns = computed(() => {
    const cols = [
      'grade',
      'route',
      'topo',
      'color',
      'rating',
      'ascents',
      'actions',
    ];
    if (this.canEditIndoor()) {
      cols.splice(cols.indexOf('rating'), 1);
      cols.splice(cols.indexOf('ascents'), 1);
      cols.splice(cols.indexOf('actions'), 1);
      cols.push('equippers');
      cols.push('admin_actions');
    }
    return cols;
  });

  protected getIndoorRef(item: RoutesTableRow): IndoorRouteWithExtras {
    return item._ref as IndoorRouteWithExtras;
  }

  protected async logIndoorAscent(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        grade: r.grade ?? undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async editIndoorAscent(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
    ascent:
      | RouteAscentWithExtras
      | { id: string | number; type: AscentType | null },
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    const asc = ascent as { id: string | number; type: AscentType | null };
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: {
          ...asc,
          route: {
            id: r.id,
            name: r.name,
            climbing_kind: r.climbing_kind,
            grade: r.grade,
            center_name: r.center_name,
            center_slug: r.center_slug,
          },
        } as unknown as RouteAscentWithExtras,
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        grade: r.grade ?? undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async editIndoorRoute(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoorService.openIndoorRouteForm(id, r);
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async deleteIndoorRoute(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    if (!isPlatformBrowser(this.platformId)) return;
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    await this.indoorService.deleteRoute(r.id);
    this.indoorService.reloadCenterRoutes();
  }

  protected async toggleRouteOnTopo(
    topoId: number | string,
    routeId: number | string,
    isPresent: boolean,
  ): Promise<void> {
    const tid = typeof topoId === 'string' ? topoId : String(topoId);
    const rid = typeof routeId === 'string' ? routeId : String(routeId);
    try {
      await this.supabaseService.whenReady();
      const client = this.supabaseService.client;
      if (isPresent) {
        const { error } = await client
          .from('indoor_topo_routes')
          .delete()
          .eq('topo_id', tid)
          .eq('route_id', rid);
        if (error) throw error;
      } else {
        const { error } = await client.from('indoor_topo_routes').insert({
          topo_id: tid,
          route_id: rid,
          number: 0,
        });
        if (error) throw error;
      }
      this.indoorService.reloadCenterRoutes();
    } catch (e: unknown) {
      console.error('[IndoorRoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }
}
