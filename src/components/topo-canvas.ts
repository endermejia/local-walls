import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import {
  TuiButton,
  TuiIcon,
  TuiLoader,
} from '@taiga-ui/core';

import { GradeComponent } from './avatar-grade';

import {
  getRouteStyleProperties,
  getRouteStrokeWidth,
  getPointsString as getPointsStringUtil,
} from '../utils/topo-styles.utils';
import {
  ZoomPanState,
  resetZoomState,
  handleWheelZoom,
  constrainTranslation,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  handleViewerWheelZoom,
  ViewerZoomPanState,
  createViewerDragState,
  handleViewerTouchStart,
  handleViewerTouchMove,
  handleViewerMouseDown,
  handleViewerMouseMove,
  attachWheelListener,
} from '../utils/zoom-pan.utils';
import {
  removePoint,
  addPointToPath,
  startDragPointMouse,
  startDragPointTouch,
} from '../utils/drawing.utils';
import { GRADE_NUMBER_TO_LABEL, VERTICAL_LIFE_GRADES } from '../models';

export interface TopoCanvasRoute {
  id: number;
  name?: string;
  grade?: string | number;
  points: { x: number; y: number }[];
  color?: string;
  number?: number;
  isProject?: boolean;
  isClimbed?: boolean;
}

@Component({
  selector: 'app-topo-canvas',
  standalone: true,
  imports: [CommonModule, TuiLoader, GradeComponent, TuiIcon, TuiButton],
  template: `
    <div
      class="w-full h-full relative overflow-hidden touch-none select-none bg-[var(--tui-background-neutral-1)]"
      #container
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
        class="h-full w-full flex items-center justify-center min-w-full"
      >
        <div
          class="relative transition-transform ease-out zoom-container origin-top-left"
          #zoomContainer
          [class.duration-75]="mode() === 'view' || !dragState.isDragging"
          [class.!duration-0]="dragState.isDragging"
          [style.transform]="transform()"
          (click.zoneless)="onImageClick($event)"
        >
          <!-- Image -->
           @if (src(); as source) {
            <img
              [src]="source"
              class="block object-cover max-w-none pointer-events-none"
              [class.w-auto]="mode() === 'view'"
              [class.h-full]="mode() === 'view'"
              [class.max-w-[calc(100dvw-22rem)]]="mode() === 'edit'"
              [class.max-h-[calc(100dvh-5rem)]]="mode() === 'edit'"
              draggable="false"
              (load)="onImageLoad($event)"
            />
           } @else {
             <div class="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400">
               <tui-icon icon="@tui.image" class="text-4xl" />
             </div>
           }

          <!-- SVG Overlay -->
          @if (width() > 0 && height() > 0) {
            <svg
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
              preserveAspectRatio="none"
            >
              <!-- Layer 1: Hit Areas (Bottom) - Only in View mode or generic hit detection -->
              @for (route of sortedRoutes(); track route.id) {
                @if (route.points.length > 0) {
                  <polyline
                    class="pointer-events-auto cursor-pointer"
                    (click)="onRouteClick($event, route)"
                    (mouseenter)="hoveredId.set(route.id)"
                    (mouseleave)="hoveredId.set(null)"
                    [attr.points]="getPointsString(route.points)"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="getHitStrokeWidth(route.id)"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                }
              }

              <!-- Layer 2: Visuals (Lines) -->
              @for (route of sortedRoutes(); track route.id) {
                @if (route.points.length > 0) {
                  @let style = getRouteStyle(route);
                  @let widthVal = getRouteWidth(route.id);

                  <!-- Border/Shadow Line -->
                  <polyline
                    [attr.points]="getPointsString(route.points)"
                    fill="none"
                    stroke="white"
                    [style.opacity]="style.isDashed ? 1 : 0.7"
                    [attr.stroke-width]="widthVal + (style.isDashed ? 2.5 : 1.5)"
                    [attr.stroke-dasharray]="style.isDashed ? (mode() === 'edit' ? '' + widthVal * 2 + ' ' + widthVal * 2 : '10, 10') : 'none'"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />

                  <!-- Main Line -->
                  <polyline
                    [attr.points]="getPointsString(route.points)"
                    fill="none"
                    [attr.stroke]="style.stroke"
                    [style.opacity]="style.opacity"
                    [attr.stroke-width]="widthVal"
                    [attr.stroke-dasharray]="style.isDashed ? (mode() === 'edit' ? '' + widthVal * 2 + ' ' + widthVal * 2 : '10, 10') : 'none'"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />

                  <!-- End Circle -->
                  @if (route.points[route.points.length - 1]; as last) {
                    <circle
                      [attr.cx]="last.x * width()"
                      [attr.cy]="last.y * height()"
                      [attr.r]="widthVal"
                      fill="white"
                      [style.opacity]="style.opacity"
                      stroke="black"
                      [attr.stroke-width]="0.5"
                    />
                  }
                }
              }

              <!-- Layer 3: Indicators (View Mode) or Start Circles -->
              @for (route of sortedRoutes(); track route.id) {
                @if (route.points.length > 0) {
                  @let style = getRouteStyle(route);

                  @if (route.points[0]; as first) {
                    <g
                      class="pointer-events-auto cursor-pointer"
                      (click)="onRouteClick($event, route)"
                      (mouseenter)="hoveredId.set(route.id)"
                      (mouseleave)="hoveredId.set(null)"
                    >
                      <circle
                        [attr.cx]="first.x * width()"
                        [attr.cy]="first.y * height()"
                        [attr.r]="mode() === 'view' ? 10 : (width() * 0.008)"
                        [attr.fill]="style.stroke"
                        stroke="white"
                        stroke-width="1"
                      />
                      @if (mode() === 'view') {
                        <text
                          [attr.x]="first.x * width()"
                          [attr.y]="first.y * height() + 3"
                          text-anchor="middle"
                          fill="white"
                          style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                          font-size="8"
                          font-weight="bold"
                          font-family="sans-serif"
                          class="pointer-events-none"
                        >
                          {{ getGradeLabel(route.grade) }}
                        </text>
                      } @else {
                        <!-- Number bubble for editor -->
                         <text
                          [attr.x]="first.x * width()"
                          [attr.y]="first.y * height() - (width() * 0.016)"
                          text-anchor="middle"
                          fill="var(--tui-text-01)"
                          [attr.font-size]="width() * 0.01"
                          font-weight="bold"
                          class="pointer-events-none"
                          style="text-shadow: 0 0 2px white"
                        >
                          {{ route.number !== undefined ? route.number + 1 : '' }}
                        </text>
                      }
                    </g>
                  }
                }
              }

              <!-- Layer 4: Control Points (Edit Mode + Selected) -->
              @if (mode() === 'edit' && editable() && selectedRoute()) {
                 @for (pt of selectedRoute()!.points; track $index) {
                    <g
                      class="cursor-move pointer-events-auto group"
                      (mousedown)="startDragging($event, selectedRoute()!.id, $index)"
                      (touchstart)="startDraggingTouch($event, selectedRoute()!.id, $index)"
                      (click)="$event.stopPropagation()"
                      (contextmenu)="removePoint($event, selectedRoute()!.id, $index)"
                    >
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        [attr.r]="width() * 0.012"
                        fill="rgba(0,0,0,0.4)"
                        class="hover:fill-[var(--tui-background-neutral-2)]/60 transition-colors"
                      />
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        [attr.r]="width() * 0.006"
                        [attr.fill]="getRouteStyle(selectedRoute()!).stroke"
                        class="group-hover:scale-125 transition-transform origin-center"
                        style="transform-box: fill-box"
                      />
                    </g>
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
export class TopoCanvasComponent implements AfterViewInit {
  // Inputs
  src = input<string | SafeUrl | null>(null);
  mode = input<'view' | 'edit'>('view');
  editable = input(false);
  routes = input<TopoCanvasRoute[]>([]);

  // Model Signals for two-way binding or simple input
  selectedId = input<number | null>(null);
  hoveredId = input<number | null>(null);

  // Outputs
  @Output() selectedIdChange = new EventEmitter<number | null>();
  @Output() hoveredIdChange = new EventEmitter<number | null>();
  @Output() pathChange = new EventEmitter<{ id: number; points: { x: number; y: number }[] }>();
  @Output() imgLoad = new EventEmitter<{ width: number; height: number }>();
  @Output() bgClick = new EventEmitter<MouseEvent>();

  // Internal State
  @ViewChild('container') containerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('zoomContainer') zoomContainerRef?: ElementRef<HTMLDivElement>;

  // Dimensions
  width = signal(0);
  height = signal(0);

  // Zoom State
  // We maintain both state shapes internally but use one depending on mode
  // Actually, we can unify the interface for the view template using computed signals
  zoomScale = signal(1);
  zoomX = signal(0);
  zoomY = signal(0);

  // Adapters for Utils
  // Editor Style State
  private get editorState(): ZoomPanState {
    return {
      scale: this.zoomScale,
      translateX: this.zoomX,
      translateY: this.zoomY,
    };
  }

  // Viewer Style State (uses {x,y} object instead of separate signals)
  // We will sync them or just use separate logic.
  // To avoid circular updates, we will use separate signals for viewer logic if needed,
  // OR just adapt the viewer utils to use separate signals?
  // No, `handleViewer...` expects `ViewerZoomPanState` with `zoomPosition` signal.
  zoomPosition = signal({ x: 0, y: 0 });

  private get viewerState(): ViewerZoomPanState {
    return {
      zoomScale: this.zoomScale,
      zoomPosition: this.zoomPosition,
    };
  }

  dragState = createViewerDragState(); // Used for Viewer interactions

  // Dragging Point State (Editor)
  draggingPoint: { routeId: number; index: number } | null = null;

  // Computed for Transform
  transform = computed(() => {
    if (this.mode() === 'view') {
       const pos = this.zoomPosition();
       return `translate(${pos.x}px, ${pos.y}px) scale(${this.zoomScale()})`;
    } else {
       return `translate(${this.zoomX()}px, ${this.zoomY()}px) scale(${this.zoomScale()})`;
    }
  });

  // Computed Routes (sorted)
  sortedRoutes = computed(() => {
    const r = this.routes();
    const sel = this.selectedId();
    const hov = this.hoveredId();

    return [...r].sort((a, b) => {
      const getPriority = (id: number) => {
        if (id === sel) return 2;
        if (id === hov) return 1;
        return 0;
      };
      return getPriority(a.id) - getPriority(b.id) || (a.number || 0) - (b.number || 0);
    });
  });

  selectedRoute = computed(() =>
    this.routes().find(r => r.id === this.selectedId()) || null
  );

  ngAfterViewInit() {
    if (this.containerRef) {
      attachWheelListener(this.containerRef.nativeElement, (e) => this.onWheel(e));
    }
  }

  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.width.set(img.naturalWidth);
      this.height.set(img.naturalHeight);
      this.imgLoad.emit({ width: img.naturalWidth, height: img.naturalHeight });

      this.resetZoom();
    }
  }

  resetZoom() {
    if (this.mode() === 'view') {
      this.zoomScale.set(1);
      this.zoomPosition.set({ x: 0, y: 0 });
      this.dragState = createViewerDragState();
    } else {
      this.zoomScale.set(1);
      this.zoomX.set(0);
      this.zoomY.set(0);
    }
  }

  // Interaction Handlers
  onWheel(event: Event) {
    if (this.mode() === 'view') {
      handleViewerWheelZoom(event, this.viewerState);
    } else {
      // Editor mode
      if (!this.containerRef) return;
      handleWheelZoom(event, this.editorState, this.containerRef.nativeElement, {}, {
        afterZoom: () => {
           if (this.containerRef) {
             constrainTranslation(this.editorState, this.containerRef.nativeElement, this.width(), this.height());
           }
        }
      });
    }
  }

  onTouchStart(event: Event) {
    if (this.mode() === 'view') {
      handleViewerTouchStart(event, this.viewerState, this.dragState);
    } else {
      if (!this.containerRef) return;
      setupEditorTouchPanPinch(event, this.editorState, this.containerRef.nativeElement, {}, {
        afterMove: () => {
           if (this.containerRef) {
             constrainTranslation(this.editorState, this.containerRef.nativeElement, this.width(), this.height());
           }
        },
        isDraggingPoint: () => !!this.draggingPoint
      });
    }
  }

  onTouchMove(event: Event) {
    if (this.mode() === 'view') {
      handleViewerTouchMove(event, this.viewerState, this.dragState);
    }
    // Editor touch move is handled by event listeners attached in setupEditorTouchPanPinch/startDragPointTouch
  }

  onTouchEnd() {
    if (this.mode() === 'view') {
      this.dragState.isDragging = false;
    }
    // Editor touch end handled by listeners
  }

  onMouseDown(event: MouseEvent) {
    if (this.mode() === 'view') {
      handleViewerMouseDown(event, this.viewerState, this.dragState);
    } else {
      // Editor pan
      // We only start panning if we aren't clicking a point (points stop prop)
      // and if we aren't adding a point (handled in onImageClick usually)
      if (this.draggingPoint) return;
      if (event.button !== 0) return;

      setupEditorMousePan(event, this.editorState, {}, {
        onNoMove: (e) => this.onImageClick(e), // Delegate click if no drag occurred
        afterMove: () => {
           if (this.containerRef) {
             constrainTranslation(this.editorState, this.containerRef.nativeElement, this.width(), this.height());
           }
        }
      });
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.mode() === 'view') {
      handleViewerMouseMove(event, this.viewerState, this.dragState);
    }
  }

  onMouseUp() {
    if (this.mode() === 'view') {
      this.dragState.isDragging = false;
    }
  }

  onImageClick(event: Event) {
    const mouseEvent = event as MouseEvent;
    if (this.dragState.isDragging || this.draggingPoint) return;

    // View Mode: Handle "Reset Selection" or "Toggle Fullscreen" logic?
    // The parent handles fullscreen toggle usually. We just emit bgClick.
    if (this.mode() === 'view') {
       if (this.selectedId()) {
         this.selectedIdChange.emit(null);
       } else {
         this.bgClick.emit(mouseEvent);
       }
       return;
    }

    // Edit Mode: Add Point
    if (this.mode() === 'edit' && this.editable() && this.selectedId()) {
       if (!this.zoomContainerRef) return;

       // Need to map paths for drawing utils
       const map = this.getPathsMap();

       addPointToPath(
         mouseEvent,
         this.selectedId()!,
         this.zoomContainerRef.nativeElement,
         this.zoomScale(),
         this.width(),
         this.height(),
         map,
         { color: this.selectedRoute()?.color }
       );

       this.emitPathUpdate(this.selectedId()!, map);
    }
  }

  onRouteClick(event: Event, route: TopoCanvasRoute) {
    event.stopPropagation();
    if (this.selectedId() === route.id) {
       this.selectedIdChange.emit(null);
    } else {
       this.selectedIdChange.emit(route.id);
    }
  }

  // Drawing Utils Wrappers
  startDragging(event: MouseEvent, routeId: number, index: number) {
    if (!this.editable() || !this.zoomContainerRef) return;
    this.draggingPoint = { routeId, index };
    const map = this.getPathsMap();

    startDragPointMouse(
      event,
      routeId,
      index,
      this.zoomContainerRef.nativeElement,
      this.zoomScale(),
      this.width(),
      this.height(),
      map,
      {
        onEnd: () => {
          this.draggingPoint = null;
          this.emitPathUpdate(routeId, map);
        }
      }
    );
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number) {
    if (!this.editable() || !this.zoomContainerRef) return;
    this.draggingPoint = { routeId, index };
    const map = this.getPathsMap();

    startDragPointTouch(
      event,
      routeId,
      index,
      this.zoomContainerRef.nativeElement,
      this.zoomScale(),
      this.width(),
      this.height(),
      map,
      {
        onEnd: () => {
          this.draggingPoint = null;
          this.emitPathUpdate(routeId, map);
        },
        onLongPress: () => {
           this.removePoint(event, routeId, index);
           this.draggingPoint = null;
        }
      }
    );
  }

  removePoint(event: Event, routeId: number, index: number) {
     if (!this.editable()) return;
     const map = this.getPathsMap();
     removePoint(event, routeId, index, map);
     this.emitPathUpdate(routeId, map);
  }

  // Helpers
  getPointsString(points: { x: number; y: number }[]): string {
    return getPointsStringUtil(points, this.width(), this.height());
  }

  getHitStrokeWidth(id: number): number {
    const isSelected = this.selectedId() === id;
    const base = this.mode() === 'view' ? 0.025 : 0.06;
    return (isSelected ? base * 2.4 : base) * this.width(); // Roughly scaled
  }

  getRouteWidth(id: number): number {
    const isSelected = this.selectedId() === id;
    const isHovered = this.hoveredId() === id;
    return getRouteStrokeWidth(isSelected, isHovered, this.mode() === 'view' ? 2 : 30, this.mode() === 'view' ? 'viewer' : 'editor') * this.width();
  }

  getRouteStyle(route: TopoCanvasRoute) {
    const isSelected = this.selectedId() === route.id;
    const isHovered = this.hoveredId() === route.id;
    return getRouteStyleProperties(isSelected, isHovered, route.color, route.grade || '');
  }

  getGradeLabel(grade: string | number | undefined): string {
     if (!grade) return '';
     return GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || grade.toString();
  }

  private getPathsMap(): Map<number, { points: {x:number, y:number}[], color?: string }> {
    const map = new Map();
    this.routes().forEach(r => {
      map.set(r.id, { points: [...r.points], color: r.color });
    });
    return map;
  }

  private emitPathUpdate(id: number, map: Map<number, { points: {x:number, y:number}[] }>) {
     const data = map.get(id);
     if (data) {
       this.pathChange.emit({ id, points: data.points });
     }
  }
}
