import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { TopoDetail, TopoRouteWithRoute } from '../models';
import { AvatarGradeComponent } from '../components/avatar-grade';
import { ToastService, ToposService } from '../services';

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
    TranslatePipe,
    AvatarGradeComponent,
    TuiScrollbar,
  ],
  template: `
    <div class="flex flex-col h-full overflow-hidden bg-neutral-900 text-white">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
        <div class="flex items-center gap-3">
          <button
            tuiIconButton
            appearance="flat"
            size="s"
            class="!rounded-full !text-white"
            (click)="close()"
          >
            <tui-icon icon="@tui.x" />
          </button>
          <span class="font-bold text-lg tracking-tight">{{ context.data.topo.name }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            tuiButton
            appearance="primary"
            size="m"
            class="!rounded-full !px-8 shadow-xl shadow-primary/20"
            [disabled]="loading()"
            (click)="saveAll()"
          >
            {{ 'actions.save' | translate }}
          </button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar: Route List -->
        <div class="w-80 shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-sm flex flex-col z-10">
          <div class="p-4 border-b border-white/5">
            <h3 class="text-xs font-bold uppercase tracking-widest opacity-50 px-2 mb-4">
              {{ 'labels.routes' | translate }}
            </h3>
            <tui-scrollbar class="flex-1">
              <div class="flex flex-col gap-1 p-1">
                @for (tr of context.data.topo.topo_routes; track tr.route_id) {
                  <button
                    class="flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 group text-left w-full"
                    [class.bg-primary]="selectedRoute()?.route_id === tr.route_id"
                    [class.text-white]="selectedRoute()?.route_id === tr.route_id"
                    [class.hover:bg-white/10]="selectedRoute()?.route_id !== tr.route_id"
                    [attr.aria-label]="tr.route.name"
                    (click)="selectRoute(tr)"
                  >
                    <div
                      class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                      [class.border-white/20]="selectedRoute()?.route_id !== tr.route_id"
                      [class.border-white/50]="selectedRoute()?.route_id === tr.route_id"
                    >
                      {{ tr.number + 1 }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold truncate group-hover:translate-x-1 transition-transform">
                        {{ tr.route.name }}
                      </div>
                      <div class="text-[10px] opacity-60 uppercase font-medium flex gap-1">
                        {{ tr.route.grade }}
                      </div>
                    </div>
                    <app-avatar-grade [grade]="tr.route.grade" size="s" />
                    @if (hasPath(tr.route_id)) {
                      <tui-icon icon="@tui.check" class="text-green-400 text-xs" />
                    }
                  </button>
                }
              </div>
            </tui-scrollbar>
          </div>

          <div class="mt-auto p-4 bg-black/40 border-t border-white/10">
            <div class="text-xs opacity-50 space-y-2">
              <p class="flex items-center gap-2">
                <tui-icon icon="@tui.mouse-pointer-2" class="text-primary" />
                {{ 'topos.editor.addPoint' | translate }} (Click)
              </p>
              <p class="flex items-center gap-2">
                <tui-icon icon="@tui.move" class="text-primary" />
                {{ 'topos.editor.movePoint' | translate }} (Drag)
              </p>
              <p class="flex items-center gap-2">
                <tui-icon icon="@tui.maximize" class="text-white" />
                Zoom / Pan (Wheel / Right Click)
              </p>
            </div>
          </div>
        </div>

        <!-- Editor Area -->
        <div
          #viewport
          class="flex-1 relative overflow-hidden bg-black flex items-center justify-center cursor-crosshair"
          (wheel)="onWheel($event)"
          (mousedown)="startPanning($event)"
          (contextmenu)="$event.preventDefault()"
        >
          <div
            #container
            class="relative inline-block shadow-2xl rounded-lg overflow-hidden select-none origin-top-left"
            [style.transform]="transformStyle()"
            (mousedown)="onImageClick($event)"
          >
            <img
              #image
              [src]="context.data.imageUrl"
              class="max-w-[70dvw] max-h-[80dvh] block pointer-events-none"
              (load)="onImageLoad()"
              alt="Editor Background"
            />

            <!-- SVG Overlay for Paths -->
            <svg
              class="absolute inset-0 w-full h-full"
              [attr.viewBox]="viewBox()"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Draw all paths -->
              @for (entry of pathsMap | keyvalue; track entry.key) {
                @let isSelected = selectedRoute()?.route_id === +entry.key;
                <g
                  class="pointer-events-auto cursor-pointer"
                  (click)="selectRoute(entry.value._ref || { route_id: +entry.key }); $event.stopPropagation()"
                  (touchstart)="selectRoute(entry.value._ref || { route_id: +entry.key }); $event.stopPropagation()"
                >
                  <!-- Thicker transparent path for much easier hit detection -->
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    stroke="transparent"
                    vector-effect="non-scaling-stroke"
                    [attr.stroke-width]="20"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    [attr.stroke]="
                      isSelected
                        ? entry.value.color || 'var(--tui-primary)'
                        : 'rgba(255,255,255,0.4)'
                    "
                    vector-effect="non-scaling-stroke"
                    [attr.stroke-width]="isSelected ? 3 : 2"
                    [attr.stroke-dasharray]="isSelected ? 'none' : '4 4'"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                </g>

                <!-- Control Points -->
                @if (isSelected) {
                  @for (pt of entry.value.points; track $index) {
                    <g
                      class="cursor-move group"
                      (mousedown)="startDragging($event, entry.key, $index)"
                      (touchstart)="startDraggingTouch($event, entry.key, $index)"
                      (contextmenu)="removePoint($event, entry.key, $index)"
                    >
                      <!-- Scaled-inverse radius to keep points constant size visually -->
                      @let rOuter = 12 / transform().scale;
                      @let rInner = 6 / transform().scale;

                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        [attr.r]="rOuter"
                        fill="rgba(0,0,0,0.4)"
                        class="hover:fill-black/60 transition-colors"
                      />
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        [attr.r]="rInner"
                        [attr.fill]="entry.value.color || 'var(--tui-primary)'"
                        class="group-hover:scale-125 transition-transform"
                      />
                      <!-- Point Number Bubble -->
                      @if ($index === 0) {
                        @let bubbleY = pt.y * height() - (20 / transform().scale);
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="bubbleY"
                          [attr.r]="10 / transform().scale"
                          fill="white"
                        />
                        <text
                          [attr.x]="pt.x * width()"
                          [attr.y]="bubbleY + (4 / transform().scale)"
                          text-anchor="middle"
                          fill="black"
                          [attr.font-size]="10 / transform().scale"
                          font-weight="bold"
                        >
                          {{ selectedRoute()?.number! + 1 }}
                        </text>
                      }
                    </g>
                  }
                }
              }
            </svg>
          </div>

          @if (loading()) {
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
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

  @ViewChild('image') imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('container') containerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('viewport') viewportElement!: ElementRef<HTMLDivElement>;

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

  width = signal(0);
  height = signal(0);
  viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  // Zoom & Pan
  transform = signal({ x: 0, y: 0, scale: 1 });
  transformStyle = computed(
    () =>
      `translate(${this.transform().x}px, ${this.transform().y}px) scale(${this.transform().scale})`
  );

  draggingPoint: { routeId: number; index: number } | null = null;

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

  onImageLoad(): void {
    const img = this.imageElement.nativeElement;
    this.width.set(img.clientWidth);
    this.height.set(img.clientHeight);

    // Center image initially
    setTimeout(() => {
      if (this.viewportElement && this.containerElement) {
        const vp = this.viewportElement.nativeElement.getBoundingClientRect();
        const cnt = this.containerElement.nativeElement.getBoundingClientRect();
        this.transform.set({
          x: (vp.width - cnt.width) / 2,
          y: (vp.height - cnt.height) / 2,
          scale: 1
        });
      }
    });
  }

  selectRoute(tr: TopoRouteWithRoute): void {
    this.selectedRoute.set(tr);
  }

  hasPath(routeId: number): boolean {
    const pathData = this.pathsMap.get(routeId);
    return !!pathData && pathData.points.length > 0;
  }

  getPointsString(pathData: {
    points: { x: number; y: number }[];
    color?: string;
  }): string {
    return pathData.points
      .map((p) => `${p.x * this.width()},${p.y * this.height()}`)
      .join(' ');
  }

  // --- Zoom & Pan Logic ---

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scaleBy = 1.1;
    const current = this.transform();
    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? current.scale * scaleBy : current.scale / scaleBy;

    // Limit scale
    if (newScale < 0.1 || newScale > 20) return;

    const rect = this.viewportElement.nativeElement.getBoundingClientRect();
    // Mouse position relative to viewport
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Adjust position to zoom towards mouse
    // Formula: newPos = mouse - (mouse - oldPos) * (newScale / oldScale)
    const newX = mouseX - (mouseX - current.x) * (newScale / current.scale);
    const newY = mouseY - (mouseY - current.y) * (newScale / current.scale);

    this.transform.set({ x: newX, y: newY, scale: newScale });
  }

  startPanning(e: MouseEvent): void {
    // Right click (2) or Middle click (1)
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      const startX = e.clientX - this.transform().x;
      const startY = e.clientY - this.transform().y;

      const onMove = (mv: MouseEvent) => {
        this.transform.update((t) => ({
          ...t,
          x: mv.clientX - startX,
          y: mv.clientY - startY,
        }));
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  }

  // --- Drawing Logic ---

  onImageClick(event: MouseEvent): void {
    // Only Left Click (0)
    if (event.button !== 0 || this.draggingPoint) return;

    const route = this.selectedRoute();
    if (!route) return;

    // Use getBoundingClientRect logic which naturally handles transform
    // But we need to be careful: container rect includes scale.
    // Normalized x/y (0..1) should be relative to the image content.
    const rect = this.containerElement.nativeElement.getBoundingClientRect();

    // Normalized coordinates (0 to 1)
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // Bounds check (sometimes slightly out due to rounding)
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const current = this.pathsMap.get(route.route_id) || {
      points: [],
      _ref: route,
    };
    this.pathsMap.set(route.route_id, {
      ...current,
      points: [...current.points, { x, y }],
    });
  }

  startDragging(event: MouseEvent, routeId: number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingPoint = { routeId: +routeId, index };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.draggingPoint) return;
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const pathData = this.pathsMap.get(this.draggingPoint!.routeId);
      if (pathData) {
        pathData.points[this.draggingPoint!.index] = { x, y };
        this.pathsMap.set(this.draggingPoint!.routeId, { ...pathData });
      }
    };

    const onMouseUp = () => {
      this.draggingPoint = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingPoint = { routeId: +routeId, index };

    const LONG_PRESS_DELAY = 600;
    const MOVE_THRESHOLD = 10;
    const startX = event.touches[0].clientX;
    const startY = event.touches[0].clientY;
    let isLongPress = false;

    const longPressTimeout = setTimeout(() => {
      isLongPress = true;
      this.removePoint(event, routeId, index);
      onTouchEnd();
    }, LONG_PRESS_DELAY);

    const onTouchMove = (e: TouchEvent) => {
      if (!this.draggingPoint || e.touches.length === 0) return;

      const touch = e.touches[0];
      const dist = Math.sqrt(
        Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2),
      );

      if (dist > MOVE_THRESHOLD) {
        clearTimeout(longPressTimeout);
      }

      if (isLongPress) return;

      e.preventDefault();
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (touch.clientX - rect.left) / rect.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (touch.clientY - rect.top) / rect.height),
      );

      const pathData = this.pathsMap.get(this.draggingPoint!.routeId);
      if (pathData) {
        pathData.points[this.draggingPoint!.index] = { x, y };
        this.pathsMap.set(this.draggingPoint!.routeId, { ...pathData });
      }
    };

    const onTouchEnd = () => {
      clearTimeout(longPressTimeout);
      this.draggingPoint = null;
      window.removeEventListener(
        'touchmove',
        onTouchMove as EventListenerOrEventListenerObject,
      );
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener(
      'touchmove',
      onTouchMove as EventListenerOrEventListenerObject,
      { passive: false },
    );
    window.addEventListener('touchend', onTouchEnd);
  }

  removePoint(event: Event, routeId: number, index: number): void {
    if (event instanceof MouseEvent || event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    const pathData = this.pathsMap.get(routeId);
    if (pathData) {
      pathData.points.splice(index, 1);
      this.pathsMap.set(routeId, { ...pathData });
    }
  }

  close(): void {
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const topo = this.context.data.topo;
      for (const [routeId, path] of this.pathsMap.entries()) {
        await this.topos.updateRoutePath(topo.id, routeId, path);
      }
      this.toast.success('Croquis actualizado correctamente');
      this.context.completeWith(true);
    } catch (error) {
      console.error('[TopoEditor] Error saving paths', error);
      this.toast.error('Error al guardar los caminos del croquis');
    } finally {
      this.loading.set(false);
    }
  }
}
