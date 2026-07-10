import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { TUI_CONFIRM, TuiBadge, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiButton, TuiDataList, TuiLoader } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { TopoViewerComponent } from '../../components/topo/topo-viewer';
import { TopoRoutesTableComponent } from '../../components/topo/topo-routes-table';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import type { TopoRouteRow } from '../../components/topo/topo.types';
import type { TopoDetail, IndoorTopoDto } from '../../models';
import { TopoPageBase } from '../area/topo-page-base';

@Component({
  selector: 'app-indoor-topo',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TopoViewerComponent,
    TopoRoutesTableComponent,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiDataList,
    TuiLoader,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full md:p-4">
        @let isMobile = global.isMobile();
        @if (topo(); as t) {
          <div class="mb-4 p-4 md:p-0">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
            >
              <ng-container titleInfo>
                @if (t.legacy) {
                  <span
                    tuiBadge
                    size="s"
                    appearance="neutral"
                    class="uppercase text-[10px] shrink-0"
                  >
                    {{ 'indoor.legacy' | translate }}
                  </span>
                }
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>

              <div actionButtons class="flex gap-2">
                @if (canEdit()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="rounded-full!"
                    (click.zoneless)="openEditTopo(t)"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin()) {
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="rounded-full!"
                      (click.zoneless)="deleteTopo(t)"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                }
              </div>
            </app-section-header>
          </div>

          <div
            class="grid grid-cols-1 grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 w-full h-full gap-4 overflow-hidden"
          >
            <app-topo-viewer
              class="relative w-full h-full lg:col-span-2"
              [topoImage]="topoImageResource.value()"
              [topoName]="t.name"
              [renderedRoutes]="renderedTopoRoutes()"
              [hasAccess]="true"
              [selectedRouteId]="selectedRouteId()"
              [hoveredRouteId]="hoveredRouteId()"
              (selectedRouteIdChange)="selectedRouteId.set($event)"
              (hoveredRouteIdChange)="hoveredRouteId.set($event)"
            />

            <app-topo-routes-table
              [sortedTableData]="sortedTableData()"
              [columns]="columns()"
              [canEdit]="canEdit()"
              [isMobile]="isMobile"
              [selectedRouteId]="selectedRouteId()"
              [hasAccess]="true"
              [isIndoor]="true"
              [direction]="direction()"
              [sorter]="sorter()"
              [topoId]="t.id"
              (selectedRouteIdChange)="selectedRouteId.set($event)"
              (hoveredRouteIdChange)="hoveredRouteId.set($event)"
              (sortChange)="onSortChange($event)"
            />
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class IndoorTopoComponent extends TopoPageBase {
  private readonly platformId = inject(PLATFORM_ID);

  override isIndoor = computed(() => true);

  protected readonly canEditAsAdmin = computed(() => {
    const centerId = this.topo()?.center_id ?? '';
    return !!this.global.indoorAdminPermissions()[centerId];
  });

  protected readonly topoImageResource = resource({
    params: () => {
      const t = this.topo();
      if (!t?.photo) return null;
      return { path: t.photo };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      return this.supabase.getPublicUrl('indoor-assets', params.path);
    },
  });

  protected readonly canEdit = computed(() => {
    const centerId = this.topo()?.center_id ?? '';
    return !!this.global.indoorAdminPermissions()[centerId];
  });

  protected readonly columns = computed(() => {
    const isMobile = this.global.isMobile();
    const base = isMobile
      ? ['index', 'grade', 'name']
      : ['index', 'grade', 'name', 'actions'];
    const t = this.topo();
    const centerId = t?.center_id ?? '';
    if (!isMobile && this.global.indoorAdminPermissions()[centerId]) {
      base.push('admin_actions');
    }
    return base;
  });

  protected readonly tableData = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr) => {
      const r = tr.route;
      const climbed = !!r.own_ascent && r.own_ascent.type !== 'attempt';
      const project = !!r.project;
      return {
        index: tr.number,
        name: r.name,
        grade: r.grade,
        height: r.height || null,
        slug: r.slug,
        link: ['/indoor', this.centerSlug()!, 'route', r.slug],
        climbed,
        project,
        _ref: tr,
      } as TopoRouteRow;
    });
  });

  protected readonly sortedTableData = computed(() => {
    const data = this.tableData();
    const sorter = this.sorter();
    const direction = this.direction();
    if (!sorter) return data;
    return [...data].sort((a, b) => {
      const result = sorter(a, b);
      return direction === 1 ? -result : result;
    });
  });

  protected openEditTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const centerId = topo.center_id as string;
    const topoId = this.id();
    if (!topoId || !centerId) return;
    this.indoorService
      .openIndoorTopoForm(centerId, {
        id: topoId,
        name: topo.name,
        image_url: topo.photo ?? '',
        climbing_kind: null,
        legacy: topo.legacy ?? false,
        center_id: centerId,
        created_at: '',
        end_date: null,
        start_date: null,
      } as IndoorTopoDto)
      .then((success) => {
        if (success) this.global.topoDetailResource.reload();
      });
  }

  protected deleteTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.indoorService
        .deleteTopo(String(this.id()))
        .then(() => this.router.navigate(['/indoor', this.centerSlug()]))
        .catch(() => {});
    });
  }
}
