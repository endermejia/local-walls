import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import {
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../services/global-data';
import { ToastService } from '../services/toast.service';
import { ToposService } from '../services/topos.service';

import { GradeComponent } from '../components/avatar-grade';

import { TopoDetail, TopoRouteWithRoute } from '../models';

import {
} from '../utils/topo-styles.utils';
import { TopoCanvasComponent } from '../components/topo-canvas';
import { TopoCanvasRoute } from '../models/topo-canvas.models';

export interface TopoPathEditorConfig {
  topo: TopoDetail;
  imageUrl: string;
}

@Component({
  selector: 'app-topo-path-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TuiIcon,
    TuiButton,
    TuiLoader,
    GradeComponent,
    TranslateModule,
    TuiScrollbar,
    TopoCanvasComponent,
  ],
  template: `
    <div
      class="flex flex-col h-full overflow-hidden bg-[var(--tui-background-neutral-2)] text-[var(--tui-text-01)]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 shrink-0 border-b border-[var(--tui-border-normal)] bg-[var(--tui-background-neutral-1)]/40 backdrop-blur-md"
      >
        <div class="flex items-center gap-3">
          <button
            tuiIconButton
            appearance="flat"
            size="s"
            class="!rounded-full !text-[var(--tui-text-01)]"
            (click)="close()"
          >
            <tui-icon icon="@tui.x" />
          </button>
          <span class="font-bold text-lg tracking-tight">{{
            context.data.topo.name
          }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            tuiButton
            appearance="flat"
            size="m"
            class="!rounded-full !px-6"
            [disabled]="loading()"
            (click)="sortByPosition()"
          >
            <tui-icon icon="@tui.list-ordered" class="mr-2" />
            {{ 'topos.editor.sort' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary"
            size="m"
            class="!rounded-full !px-8 shadow-xl shadow-[var(--tui-background-accent-1)]/20"
            [disabled]="loading()"
            (click)="saveAll()"
          >
            {{ 'save' | translate }}
          </button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar: Route List -->
        <div
          class="w-80 shrink-0 border-r border-[var(--tui-border-normal)] bg-[var(--tui-background-neutral-1)]/20 backdrop-blur-sm flex flex-col"
        >
          <div class="p-4 border-b border-[var(--tui-border-normal)]">
            <h3
              class="text-xs font-bold uppercase tracking-widest opacity-50 px-2 mb-4"
            >
              {{ 'routes' | translate }}
            </h3>
            <tui-scrollbar class="flex-1">
              <div class="flex flex-col gap-1 p-1">
                @for (tr of context.data.topo.topo_routes; track tr.route_id) {
                  <button
                    class="flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 group text-left w-full"
                    [ngClass]="{
                      'bg-[var(--tui-background-accent-1)] text-[var(--tui-text-primary-on-accent-1)] ring-2 ring-inset ring-[var(--tui-border-normal)]/50':
                        selectedRoute()?.route_id === tr.route_id,
                      'hover:bg-[var(--tui-background-neutral-1)]/10':
                        selectedRoute()?.route_id !== tr.route_id,
                    }"
                    [attr.aria-label]="tr.route.name"
                    (click)="selectRoute(tr, true)"
                  >
                    <div
                      class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                      [ngClass]="{
                        'border-[var(--tui-border-normal)]':
                          selectedRoute()?.route_id !== tr.route_id,
                        'border-[var(--tui-border-normal)]/50':
                          selectedRoute()?.route_id === tr.route_id,
                      }"
                    >
                      {{ tr.number + 1 }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div
                        class="font-bold truncate group-hover:translate-x-1 transition-transform"
                      >
                        {{ tr.route.name }}
                      </div>
                      <div
                        class="text-[10px] opacity-60 uppercase font-medium flex gap-1"
                      >
                        {{ tr.route.grade }}
                      </div>
                    </div>
                    <app-grade [grade]="tr.route.grade" size="s" />
                    @if (hasPath(tr.route_id)) {
                      <tui-icon
                        icon="@tui.check"
                        class="text-[var(--tui-text-positive)] text-xs"
                      />
                    }
                  </button>
                }
              </div>
            </tui-scrollbar>
          </div>

          <div
            class="mt-auto p-4 bg-[var(--tui-background-neutral-1)]/40 border-t border-[var(--tui-border-normal)]"
          >
            <div class="text-xs opacity-50 space-y-2">
              <p class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.mouse-pointer-2"
                  class="text-[var(--tui-text-accent-1)]"
                />
                {{ 'topos.editor.addPoint' | translate }}
              </p>
              <p class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.move"
                  class="text-[var(--tui-text-accent-1)]"
                />
                {{ 'topos.editor.movePoint' | translate }}
              </p>
              <p class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.trash"
                  class="text-[var(--tui-text-negative)]"
                />
                {{ 'topos.editor.deletePoint' | translate }}
              </p>
              <p
                class="flex items-center gap-2 border-t border-[var(--tui-border-normal)] pt-2"
              >
                <tui-icon
                  icon="@tui.mouse-pointer"
                  class="text-[var(--tui-text-accent-1)]"
                />
                {{ 'topos.editor.zoom' | translate }}
              </p>
            </div>
          </div>
        </div>

        <!-- Editor Area -->
        <div
          class="flex-1 relative overflow-hidden bg-[var(--tui-background-neutral-2)] flex items-center justify-center p-2"
        >
          <app-topo-canvas
            [imageUrl]="context.data.imageUrl"
            [routes]="canvasRoutes()"
            [selectedRouteId]="selectedRoute()?.route_id || null"
            [editable]="true"
            viewMode="editor"
            (routeClick)="selectRouteById($event.id)"
            (pathChange)="onPathChange()"
          />

          @if (loading()) {
            <div
              class="absolute inset-0 bg-[var(--tui-background-neutral-2)]/60 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100dvw;
      height: 100dvh;
      font-family: 'Inter', system-ui, sans-serif;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoPathEditorDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, TopoPathEditorConfig>>();
  private readonly topos = inject(ToposService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly global = inject(GlobalData);

  loading = signal(false);
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  pathsMap = new Map<
    number,
    {
      points: { x: number; y: number }[];
      color?: string;
      _ref: TopoRouteWithRoute;
    }
  >();

  protected readonly canvasRoutes = computed<TopoCanvasRoute[]>(() => {
    // We want to return ALL routes so they are selectable, even if they have no points
    return Array.from(this.pathsMap.values()).map((entry) => ({
      id: entry._ref.route_id,
      points: entry.points,
      color: entry.color || entry._ref.path?.color || '',
      grade: entry._ref.route.grade.toString(),
      name: entry._ref.route.name,
    }));
  });

  constructor() {
    // Initialize paths from existing data - ALL routes
    this.context.data.topo.topo_routes.forEach((tr) => {
      this.pathsMap.set(tr.route_id, {
        points: tr.path ? [...tr.path.points] : [],
        color: tr.path?.color,
        _ref: tr,
      });
    });

    // Select first route by default
    if (this.context.data.topo.topo_routes.length > 0) {
      this.selectedRoute.set(this.context.data.topo.topo_routes[0]);
    }
  }

  async sortByPosition(): Promise<void> {
    const topo = this.context.data.topo;
    const routes = [...topo.topo_routes];

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.editor.sort'),
        size: 's',
        data: {
          content: this.translate.instant('topos.editor.sortConfirm'),
          yes: this.translate.instant('apply'),
          no: this.translate.instant('cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    this.loading.set(true);

    try {
      // 1. Calculate minX for each route
      const routesWithX = routes.map((tr) => {
        const pathData = this.pathsMap.get(tr.route_id);
        const points = pathData?.points || tr.path?.points || [];
        const minX =
          points.length > 0 ? Math.min(...points.map((p) => p.x)) : 999;
        return { tr, minX };
      });

      // 2. Sort by minX
      routesWithX.sort((a, b) => a.minX - b.minX);

      // 3. Update numbers locally
      for (let i = 0; i < routesWithX.length; i++) {
        const tr = routesWithX[i].tr;
        tr.number = i;
      }

      // 4. Sort the original array to reflect changes in sidebar
      topo.topo_routes.sort((a, b) => a.number - b.number);

      this.toast.success('messages.toasts.routeUpdated');
      this.cdr.markForCheck();
    } catch (error) {
      console.error('[TopoEditor] Error sorting routes', error);
      this.toast.error('messages.toasts.pathsSaveError');
    } finally {
      this.loading.set(false);
    }
  }

  selectRoute(tr: TopoRouteWithRoute, fromList = false): void {
    const selected = this.selectedRoute();

    if (fromList) {
      if (selected?.route_id === tr.route_id) {
        this.selectedRoute.set(null);
      } else {
        this.selectedRoute.set(tr);
      }
    } else {
      if (!selected) {
        this.selectedRoute.set(tr);
      }
    }
  }

  selectRouteById(id: number): void {
    const tr = this.context.data.topo.topo_routes.find(r => r.route_id === id);
    if (tr) this.selectRoute(tr);
  }

  hasPath(routeId: number): boolean {
    const entry = this.pathsMap.get(routeId);
    return !!entry && entry.points.length > 0;
  }

  onPathChange(): void {
    this.cdr.markForCheck();
  }

  close(): void {
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const topo = this.context.data.topo;

      // Save paths
      for (const [routeId, path] of this.pathsMap.entries()) {
        // Only save if there are points (or if original had points and now doesn't, we update with empty?)
        // updateRoutePath implementation handles empty path usually.
        // Assuming we always update.
        await this.topos.updateRoutePath(topo.id, routeId, path, false);
      }

      // Save order
      for (const tr of topo.topo_routes) {
        await this.topos.updateRouteOrder(
          topo.id,
          tr.route_id,
          tr.number,
          false,
        );
      }

      this.global.topoDetailResource.reload();
      this.toast.success('messages.toasts.pathsSaved');
      this.context.completeWith(true);
    } catch (error) {
      console.error('[TopoEditor] Error saving paths', error);
      this.toast.error('messages.toasts.pathsSaveError');
    } finally {
      this.loading.set(false);
    }
  }
}
