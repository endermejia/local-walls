import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TopoCanvasRoute, TopoViewMode } from '../models/topo-canvas.models';
import {
  NormalizedPoint,
  addPointToPath,
  removePoint,
  startDragPointMouse,
  startDragPointTouch,
} from '../utils/drawing.utils';
import {
  getPointsString,
  getRouteStrokeWidth,
  getRouteStyleProperties,
} from '../utils/topo-styles.utils';
import {
  ViewerDragState,
  ViewerZoomPanState,
  createViewerDragState,
  handleViewerMouseDown,
  handleViewerMouseMove,
  handleViewerTouchMove,
  handleViewerTouchStart,
  handleViewerWheelZoom,
  resetViewerZoomState,
} from '../utils/zoom-pan.utils';

@Component({
  selector: 'app-topo-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none bg-[var(--tui-background-neutral-1)]"
      #scrollContainer
      (wheel.zoneless)="onWheel($event)"
      (touchstart.zoneless)="onTouchStart($any($event))"
      (touchmove.zoneless)="onTouchMove($any($event))"
      (touchend.zoneless)="onTouchEnd()"
      (mousedown.zoneless)="onMouseDown($any($event))"
      (mousemove.zoneless)="onMouseMove($any($event))"
      (mouseup.zoneless)="onMouseUp()"
      (mouseleave.zoneless)="onMouseUp()"
    >
      <div
        class="h-full w-full flex items-center justify-center min-w-full pointer-events-none"
      >
        <div
          class="relative transition-transform duration-75 ease-out zoom-container origin-top-left pointer-events-auto"
          [class.!duration-0]="dragState.isDragging"
          [style.transform]="transform()"
          (click.zoneless)="onBgClick($event)"
        >
          <!-- Image -->
          @if (imageUrl(); as url) {
            <img
              [src]="url"
              class="w-auto h-full max-w-none block object-cover"
              draggable="false"
              decoding="async"
              (load)="onImageLoad($event)"
            />
          }

          <!-- SVG Overlay -->
          @if (imageUrl()) {
            <svg
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.viewBox]="viewBox()"
              preserveAspectRatio="none"
            >
              <!-- Routes Loop -->
              @for (route of sortedRoutes(); track route.id) {
                @if (route.points.length > 0) {
                  @let isSelected = selectedRouteId() === route.id;
                  @let isHovered = hoveredRouteId() === route.id;
                  @let width = getWidth(isSelected, isHovered);
                  @let style = getStyle(isSelected, isHovered, route);

                  <!-- Hit Area (Thick) -->
                  <polyline
                    class="pointer-events-auto cursor-pointer"
                    (click)="onRouteClick($event, route)"
                    (mouseenter)="hoveredRouteIdChange.emit(route.id)"
                    (mouseleave)="hoveredRouteIdChange.emit(null)"
                    [attr.points]="getPoints(route.points)"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="getHitWidth(isSelected)"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />

                  <!-- Border/Shadow -->
                  <polyline
                    [attr.points]="getPoints(route.points)"
                    fill="none"
                    stroke="white"
                    [style.opacity]="style.isDashed ? 1 : 0.7"
                    [attr.stroke-width]="width + (style.isDashed ? 2.5 : 1.5)"
                    [attr.stroke-dasharray]="style.isDashed ? '10, 10' : 'none'"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />

                  <!-- Main Stroke -->
                  <polyline
                    [attr.points]="getPoints(route.points)"
                    fill="none"
                    [attr.stroke]="style.stroke"
                    [style.opacity]="style.opacity"
                    [attr.stroke-width]="width"
                    [attr.stroke-dasharray]="style.isDashed ? '10, 10' : 'none'"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />

                  <!-- End Circle -->
                  @if (route.points[route.points.length - 1]; as last) {
                    <circle
                      [attr.cx]="last.x * 1000"
                      [attr.cy]="last.y * hScale()"
                      [attr.r]="width"
                      fill="white"
                      [style.opacity]="style.opacity"
                      stroke="black"
                      [attr.stroke-width]="0.5"
                    />
                  }

                  <!-- Start Circle / Label (Viewer Mode) -->
                  @if (viewMode() === 'viewer' && route.points[0]; as first) {
                    <g
                      class="pointer-events-auto cursor-pointer"
                      (click)="onRouteClick($event, route)"
                      (mouseenter)="hoveredRouteIdChange.emit(route.id)"
                      (mouseleave)="hoveredRouteIdChange.emit(null)"
                    >
                      <circle
                        [attr.cx]="first.x * 1000"
                        [attr.cy]="first.y * hScale()"
                        [attr.r]="10"
                        [attr.fill]="style.stroke"
                        stroke="white"
                        stroke-width="1"
                      />
                      <text
                        [attr.x]="first.x * 1000"
                        [attr.y]="first.y * hScale() + 3"
                        text-anchor="middle"
                        fill="white"
                        style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                        font-size="8"
                        font-weight="bold"
                        font-family="sans-serif"
                        class="pointer-events-none"
                      >
                        {{ route.grade }}
                      </text>
                    </g>
                  }

                  <!-- Control Points (Editor Mode) -->
                  @if (
                    viewMode() === 'editor' && selectedRouteId() === route.id
                  ) {
                    @for (pt of route.points; track $index) {
                      <g
                        class="cursor-move pointer-events-auto group"
                        (mousedown)="onPointMouseDown($event, route.id, $index)"
                        (touchstart)="
                          onPointTouchStart($event, route.id, $index)
                        "
                        (click)="$event.stopPropagation()"
                        (contextmenu)="
                          onPointContextMenu($event, route.id, $index)
                        "
                      >
                        <circle
                          [attr.cx]="pt.x * 1000"
                          [attr.cy]="pt.y * hScale()"
                          [attr.r]="12"
                          fill="rgba(0,0,0,0.4)"
                          class="hover:fill-[var(--tui-background-neutral-2)]/60 transition-colors"
                        />
                        <circle
                          [attr.cx]="pt.x * 1000"
                          [attr.cy]="pt.y * hScale()"
                          [attr.r]="6"
                          [attr.fill]="style.stroke"
                          class="group-hover:scale-125 transition-transform origin-center"
                          style="transform-box: fill-box"
                        />
                      </g>
                    }
                  }
                }
              }
            </svg>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoCanvasComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  // Data
  imageUrl = input.required<string | SafeUrl | null>();
  routes = input<TopoCanvasRoute[]>([]);
  selectedRouteId = input<number | null>(null);
  hoveredRouteId = input<number | null>(null);
  viewMode = input<TopoViewMode>('viewer');
  editable = input(false);

  // Outputs
  routeClick = output<TopoCanvasRoute>();
  bgClick = output<MouseEvent>();
  hoveredRouteIdChange = output<number | null>();
  pathChange = output<void>();

  // State
  private readonly scrollContainer =
    viewChild<ElementRef<HTMLElement>>('scrollContainer');

  protected readonly zoomScale = signal(1);
  protected readonly zoomPosition = signal({ x: 0, y: 0 });
  protected readonly imageRatio = signal(1);

  // Adapter for ZoomPanUtils
  private readonly viewerState: ViewerZoomPanState = {
    zoomScale: this.zoomScale,
    zoomPosition: this.zoomPosition,
  };
  protected readonly dragState: ViewerDragState = createViewerDragState();

  // Computeds
  protected readonly transform = computed(
    () =>
      `translate(${this.zoomPosition().x}px, ${this.zoomPosition().y}px) scale(${this.zoomScale()})`,
  );

  protected readonly hScale = computed(() => 1000 / this.imageRatio());
  protected readonly viewBox = computed(
    () => `0 0 1000 ${this.hScale()}`,
  );

  protected readonly sortedRoutes = computed(() => {
    const r = this.routes();
    // Sort so selected/hovered are on top
    const selected = this.selectedRouteId();
    const hovered = this.hoveredRouteId();

    return [...r].sort((a, b) => {
      const getPriority = (id: number) => {
        if (id === selected) return 2;
        if (id === hovered) return 1;
        return 0;
      };
      return getPriority(a.id) - getPriority(b.id);
    });
  });

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.imageRatio.set(img.naturalWidth / img.naturalHeight);
    }
  }

  // --- Styles ---

  getPoints(points: NormalizedPoint[]): string {
    return getPointsString(points, 1000, this.hScale());
  }

  getHitWidth(isSelected: boolean): number {
    return (isSelected ? 0.06 : 0.025) * 1000;
  }

  getWidth(isSelected: boolean, isHovered: boolean): number {
    const width = getRouteStrokeWidth(
      isSelected,
      isHovered,
      2, // Base width (using viewer default for now, can adjust based on mode)
      this.viewMode(),
    );
    return width * 1000;
  }

  getStyle(isSelected: boolean, isHovered: boolean, route: TopoCanvasRoute) {
    return getRouteStyleProperties(
      isSelected,
      isHovered,
      route.color,
      route.grade,
    );
  }

  // --- Interactions ---

  onRouteClick(event: Event, route: TopoCanvasRoute): void {
    // In viewer mode, or if not dragging
    if (this.dragState.hasMoved) return;

    this.routeClick.emit(route);
    event.stopPropagation();
  }

  onBgClick(event: Event): void {
    if (this.dragState.hasMoved) return;

    // If editable and route selected, add point
    if (
      this.editable() &&
      this.selectedRouteId() &&
      this.viewMode() === 'editor'
    ) {
      const mouseEvent = event as MouseEvent;
      const routeId = this.selectedRouteId()!;
      const container =
        this.scrollContainer()?.nativeElement.querySelector('.zoom-container');

      if (container) {
        // Create a temporary map for drawing utils
        const map = new Map<
          number,
          { points: NormalizedPoint[]; color?: string }
        >();
        const route = this.routes().find((r) => r.id === routeId);
        if (route) {
          map.set(routeId, route);
          addPointToPath(
            mouseEvent,
            routeId,
            container as HTMLElement,
            this.zoomScale(),
            1000,
            this.hScale(),
            map,
          );
          // Assuming mutation happened, trigger CD
          this.cdr.markForCheck();
          this.pathChange.emit();
        }
      }
      return;
    }

    this.bgClick.emit(event as MouseEvent);
  }

  onPointMouseDown(event: MouseEvent, routeId: number, index: number): void {
    if (!this.editable()) return;
    const container =
      this.scrollContainer()?.nativeElement.querySelector('.zoom-container');
    if (!container) return;

    const map = new Map<number, { points: NormalizedPoint[] }>();
    const route = this.routes().find((r) => r.id === routeId);
    if (route) {
      map.set(routeId, route);
      startDragPointMouse(
        event,
        routeId,
        index,
        container as HTMLElement,
        this.zoomScale(),
        1000,
        this.hScale(),
        map,
        {
          onUpdate: () => this.cdr.markForCheck(),
          onEnd: () => {
            this.cdr.markForCheck();
            this.pathChange.emit();
          },
        },
      );
    }
  }

  onPointTouchStart(event: TouchEvent, routeId: number, index: number): void {
    if (!this.editable()) return;
    const container =
      this.scrollContainer()?.nativeElement.querySelector('.zoom-container');
    if (!container) return;

    const map = new Map<number, { points: NormalizedPoint[] }>();
    const route = this.routes().find((r) => r.id === routeId);
    if (route) {
      map.set(routeId, route);
      startDragPointTouch(
        event,
        routeId,
        index,
        container as HTMLElement,
        this.zoomScale(),
        1000,
        this.hScale(),
        map,
        {
          onUpdate: () => this.cdr.markForCheck(),
          onEnd: () => {
            this.cdr.markForCheck();
            this.pathChange.emit();
          },
          onLongPress: () => {
            this.onPointContextMenu(event, routeId, index);
          },
        },
      );
    }
  }

  onPointContextMenu(event: Event, routeId: number, index: number): void {
    if (!this.editable()) return;
    const map = new Map<number, { points: NormalizedPoint[] }>();
    const route = this.routes().find((r) => r.id === routeId);
    if (route) {
      map.set(routeId, route);
      removePoint(event, routeId, index, map);
      this.cdr.markForCheck();
      this.pathChange.emit();
    }
  }

  // --- Zoom/Pan ---

  resetZoom(): void {
    resetViewerZoomState(this.viewerState);
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  onWheel(event: Event): void {
    handleViewerWheelZoom(event, this.viewerState);
  }

  onTouchStart(event: Event): void {
    handleViewerTouchStart(event, this.viewerState, this.dragState);
  }

  onTouchMove(event: Event): void {
    handleViewerTouchMove(event, this.viewerState, this.dragState);
  }

  onTouchEnd(): void {
    this.dragState.isDragging = false;
  }

  onMouseDown(event: MouseEvent): void {
    handleViewerMouseDown(event, this.viewerState, this.dragState);
  }

  onMouseMove(event: MouseEvent): void {
    handleViewerMouseMove(event, this.viewerState, this.dragState);
  }

  onMouseUp(): void {
    this.dragState.isDragging = false;
  }
}
