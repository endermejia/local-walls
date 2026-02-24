import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
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
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';
import { TopoDetail, TopoRouteWithRoute } from '../models';
import { GradeComponent } from '../components/avatar-grade';
import { GlobalData, ToastService, ToposService } from '../services';
import { ZoomableImageComponent } from '../components/zoomable-image';
import { TopoEditorPathsComponent } from '../components/topo-editor-paths';

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
    ZoomableImageComponent,
    TopoEditorPathsComponent
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
            {{ 'actions.save' | translate }}
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
              {{ 'labels.routes' | translate }}
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
          class="flex-1 relative overflow-hidden bg-[var(--tui-background-neutral-2)] flex items-center justify-center p-8"
        >
          <app-zoomable-image
             [src]="context.data.imageUrl"
             alt="Editor Background"
             imageClass="max-w-[70dvw] max-h-[80dvh] block pointer-events-none"
             (imageLoad)="onImageLoad($event)"
             (imageClick)="onImageClick($event)"
          >
             <app-topo-editor-paths
               #editorPaths
               [routes]="context.data.topo.topo_routes"
               [pathsMap]="pathsMap"
               [width]="imageWidth()"
               [height]="imageHeight()"
               [selectedRouteId]="selectedRoute()?.route_id || null"
               (routeClick)="selectRoute($event)"
               (pointDragStart)="onPointDragStart($event)"
               (pointTouchStart)="onPointTouchStart($event)"
               (pointRemove)="onPointRemove($event)"
             />
          </app-zoomable-image>

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

  @ViewChild('editorPaths') editorPaths?: TopoEditorPathsComponent;

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

  imageWidth = signal(0);
  imageHeight = signal(0);
  private imageElement?: HTMLImageElement;

  constructor() {
    // Initialize paths from existing data
    this.context.data.topo.topo_routes.forEach((tr) => {
      if (tr.path) {
        this.pathsMap.set(tr.route_id, {
          points: [...tr.path.points],
          color: tr.path.color,
          _ref: tr,
        });
      }
    });

    // Select first route by default
    if (this.context.data.topo.topo_routes.length > 0) {
      this.selectedRoute.set(this.context.data.topo.topo_routes[0]);
    }
  }

  onImageLoad(event: { width: number; height: number; element: HTMLImageElement }): void {
    this.imageElement = event.element;
    // We use clientWidth/clientHeight because the component renders the image with max-w/max-h
    // and we want SVG to match the rendered size.
    // Wait, onImageLoad from component gives natural dimensions, but also the element reference.
    // We should read the actual rendered dimensions?
    // In the template, ZoomableImageComponent sets imageClass="max-w...".
    // The image will be rendered with some size.
    // However, ZoomableImageComponent emits `imageLoad` when `img.onload` fires.
    // At that point, the layout might not be final if CSS hasn't applied or if it's display:none?
    // But it's in the DOM.
    // Let's use `requestAnimationFrame` to be safe and read clientWidth/Height.

    // Actually, ZoomableImageComponent emits `element`.
    // The SVG viewBox must match the coordinate system we use.
    // If we use natural dimensions for SVG viewBox, then we must map 0-1 coords to natural dimensions.
    // And SVG will scale automatically to fit the image if `absolute inset-0 w-full h-full` is used.

    // In the original code:
    // width.set(img.clientWidth); height.set(img.clientHeight);
    // viewBox = `0 0 width height`.
    // And points were mapped: `p.x * width`, `p.y * height`.

    // If we use `img.clientWidth` which changes on window resize?
    // The original code reset zoom on window resize/load.

    // If we use `naturalWidth`, then coordinate space is consistent.
    // SVG `viewBox="0 0 natW natH"`
    // Image `width="natW" height="natH"` (rendered via CSS to fit).
    // SVG scales with CSS too.

    // This seems more robust than using clientWidth which depends on layout.
    // Let's try using clientWidth to match previous behavior exactly if possible,
    // but clientWidth changes if window resizes. The original code didn't listen to window resize explicitly for width update?
    // It did `onImageLoad` -> `width.set(img.clientWidth)`.

    // If I use clientWidth:
    this.updateImageDimensions();
  }

  private updateImageDimensions() {
      if (!this.imageElement) return;
      this.imageWidth.set(this.imageElement.clientWidth);
      this.imageHeight.set(this.imageElement.clientHeight);

      // If we rely on clientWidth, we might need to listen to resize?
      // But `ZoomableImageComponent` handles layout.
      // If the image resizes (due to max-w/h and window resize), clientWidth changes.
      // But SVG viewBox remains old clientWidth? That would be wrong.
      // The points would be drawn at old scale.

      // Better approach: Use Natural Width/Height for the internal coordinate system of the editor.
      // SVG viewBox = `0 0 naturalWidth naturalHeight`.
      // Points = `x * naturalWidth`.
      // Since SVG overlays the image with `w-full h-full`, it stretches exactly as the image stretches.
      // So they will always align!

      // Let's switch to natural dimensions.
      // TopoPathEditorDialogComponent:
      // this.imageWidth.set(this.imageElement.naturalWidth);
      // ...

      // In onImageLoad:
      // this.imageWidth.set(event.width);
      // this.imageHeight.set(event.height);

      // Then `TopoEditorPathsComponent` uses `viewBox="0 0 natW natH"`.
      // And renders points at `p.x * natW`.
      // This is perfect.
      if (this.imageElement) {
          this.imageWidth.set(this.imageElement.naturalWidth);
          this.imageHeight.set(this.imageElement.naturalHeight);
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
          yes: this.translate.instant('actions.apply'),
          no: this.translate.instant('actions.cancel'),
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

  hasPath(routeId: number): boolean {
    const pathData = this.pathsMap.get(routeId);
    return !!pathData && pathData.points.length > 0;
  }

  onImageClick(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.addPoint(event);
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route || !this.imageElement) return;

    const rect = this.imageElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    const current = this.pathsMap.get(route.route_id) || {
      points: [],
      _ref: route,
    };
    this.pathsMap.set(route.route_id, {
      ...current,
      points: [...current.points, { x, y }],
    });
    this.editorPaths?.markForCheck();
  }

  onPointDragStart(data: { event: MouseEvent; routeId: number; index: number }): void {
      const { event, routeId, index } = data;
      const pathData = this.pathsMap.get(routeId);
      if (!pathData || !this.imageElement) return;

      event.preventDefault();
      event.stopPropagation();

      const point = pathData.points[index];

      const onMouseMove = (e: MouseEvent) => {
          if (!this.imageElement) return;
          const rect = this.imageElement.getBoundingClientRect();
          point.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          point.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

          // Trigger update manually efficiently?
          // Since we modify 'point' in place, we just need to tell Angular to check.
          // But `pathsMap` structure is unchanged.
          this.editorPaths?.markForCheck();
      };

      const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          // Finalize
          this.pathsMap.set(routeId, { ...pathData }); // Trigger reference update for binding?
          this.editorPaths?.markForCheck();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
  }

  onPointTouchStart(data: { event: TouchEvent; routeId: number; index: number }): void {
      const { event, routeId, index } = data;
      const pathData = this.pathsMap.get(routeId);
      if (!pathData || !this.imageElement) return;

      event.preventDefault();
      event.stopPropagation();

      const point = pathData.points[index];

      const onTouchMove = (e: TouchEvent) => {
          if (!this.imageElement) return;
          const touch = e.touches[0];
          const rect = this.imageElement.getBoundingClientRect();
          point.x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
          point.y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
          this.editorPaths?.markForCheck();
      };

      const onTouchEnd = () => {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          this.pathsMap.set(routeId, { ...pathData });
          this.editorPaths?.markForCheck();
      };

      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
  }

  onPointRemove(data: { event: Event; routeId: number; index: number }): void {
      data.event.preventDefault();
      data.event.stopPropagation();

      const { routeId, index } = data;
      const pathData = this.pathsMap.get(routeId);
      if (pathData) {
        pathData.points.splice(index, 1);
        this.pathsMap.set(routeId, { ...pathData });
        this.editorPaths?.markForCheck();
      }
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
