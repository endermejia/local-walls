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
import { TopoCanvasComponent, TopoCanvasRoute } from '../components/topo-canvas';

import { TopoDetail, TopoRouteWithRoute } from '../models';

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
    TopoCanvasComponent
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
                        selectedRouteId() === tr.route_id,
                      'hover:bg-[var(--tui-background-neutral-1)]/10':
                        selectedRouteId() !== tr.route_id,
                    }"
                    [attr.aria-label]="tr.route.name"
                    (click)="selectRoute(tr.route_id, true)"
                  >
                    <div
                      class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                      [ngClass]="{
                        'border-[var(--tui-border-normal)]':
                          selectedRouteId() !== tr.route_id,
                        'border-[var(--tui-border-normal)]/50':
                          selectedRouteId() === tr.route_id,
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
             mode="edit"
             [editable]="true"
             [src]="context.data.imageUrl"
             [routes]="routes()"
             [selectedId]="selectedRouteId()"
             (selectedIdChange)="onCanvasSelectionChange($event)"
             (pathChange)="onPathChange($event)"
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
  selectedRouteId = signal<number | null>(null);

  // Local state of routes (including edits)
  routes = signal<TopoCanvasRoute[]>([]);

  constructor() {
    // Initialize paths from existing data
    const initialRoutes: TopoCanvasRoute[] = this.context.data.topo.topo_routes.map(tr => ({
      id: tr.route_id,
      name: tr.route.name,
      grade: tr.route.grade,
      points: tr.path?.points ? [...tr.path.points] : [],
      color: tr.path?.color,
      number: tr.number
    }));

    this.routes.set(initialRoutes);

    // Select first route by default
    if (initialRoutes.length > 0) {
      this.selectedRouteId.set(initialRoutes[0].id);
    }
  }

  async sortByPosition(): Promise<void> {
    const topo = this.context.data.topo;
    const currentRoutes = this.routes();

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
      // 1. Calculate minX for each route based on current points
      const routesWithX = currentRoutes.map((tr) => {
        const minX =
          tr.points.length > 0 ? Math.min(...tr.points.map((p) => p.x)) : 999;
        return { tr, minX };
      });

      // 2. Sort by minX
      routesWithX.sort((a, b) => a.minX - b.minX);

      // 3. Update numbers locally and in the original topo data structure
      // (The original topo object is used for sidebar list and save logic in original code,
      // but here we primarily use 'routes' signal. However, 'saveAll' iterates topo.topo_routes in original code.
      // We should probably rely on 'routes' signal for everything or sync back.)

      const newRoutes = [...this.routes()]; // clone

      // Update newRoutes numbers
      routesWithX.forEach((item, index) => {
          // find the route in newRoutes
          const r = newRoutes.find(x => x.id === item.tr.id);
          if (r) r.number = index;
      });
      // Sort newRoutes by number
      newRoutes.sort((a, b) => (a.number || 0) - (b.number || 0));

      this.routes.set(newRoutes);

      // Also update the context.data.topo.topo_routes to reflect changes in the UI list if it uses that source
      // The template iterates context.data.topo.topo_routes.
      // We should update that too.
      topo.topo_routes.forEach(tr => {
         const r = newRoutes.find(x => x.id === tr.route_id);
         if (r) tr.number = r.number!;
      });
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

  selectRoute(routeId: number, fromList = false): void {
    const selected = this.selectedRouteId();

    if (fromList) {
      if (selected === routeId) {
        this.selectedRouteId.set(null);
      } else {
        this.selectedRouteId.set(routeId);
      }
    } else {
      // Logic for canvas interaction is handled in onCanvasSelectionChange usually
      // But if we wanted custom logic, we could do it here.
      this.selectedRouteId.set(routeId);
    }
  }

  onCanvasSelectionChange(id: number | null) {
     this.selectedRouteId.set(id);
  }

  hasPath(routeId: number): boolean {
    const r = this.routes().find(x => x.id === routeId);
    return !!r && r.points.length > 0;
  }

  onPathChange(event: { id: number, points: {x: number, y: number}[] }) {
    this.routes.update(routes =>
      routes.map(r => r.id === event.id ? { ...r, points: event.points } : r)
    );
  }

  close(): void {
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const topo = this.context.data.topo;
      const currentRoutes = this.routes();

      // Save paths
      // We iterate over our local state 'routes' to save
      for (const r of currentRoutes) {
         // Only save if it has points or if we need to clear it?
         // Original code iterated pathsMap.
         // If a route is not in pathsMap, it wasn't touched? Or it was empty?
         // Original code: `if (tr.path) pathsMap.set(...)`.
         // We initialized routes with existing paths.

         const pathData = { points: r.points, color: r.color };
         // We save all because we might have deleted points.
         await this.topos.updateRoutePath(topo.id, r.id, pathData, false);
      }

      // Save order
      for (const r of currentRoutes) {
        if (r.number !== undefined) {
           await this.topos.updateRouteOrder(
             topo.id,
             r.id,
             r.number,
             false,
           );
        }
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
