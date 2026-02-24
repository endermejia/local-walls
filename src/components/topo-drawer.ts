import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData, TuiDialogService } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';

import { GradeComponent } from '../components/avatar-grade';
import { GRADE_COLORS, TopoRouteWithRoute } from '../models';
import {
  addPointToPath,
  removePoint,
  startDragPointMouse,
  startDragPointTouch,
} from '../utils/drawing.utils';
import {
  getPointsString as getPointsStringUtil,
  getRouteColor,
  getRouteStrokeWidth,
  getRouteStyleProperties,
  hasPath as hasPathUtil,
} from '../utils/topo-styles.utils';
import {
  attachWheelListener,
  constrainTranslation,
  handleWheelZoom,
  resetZoomState,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  ZoomPanState,
} from '../utils/zoom-pan.utils';

@Component({
  selector: 'app-topo-drawer',
  standalone: true,
  imports: [
    CommonModule,
    TuiIcon,
    TuiButton,
    TuiScrollbar,
    TranslatePipe,
    GradeComponent,
  ],
  template: `
    <div
      class="drawer-container"
      #drawArea
      (wheel.zoneless)="onWheel($event)"
    >
      <div
        #drawContainer
        class="draw-surface"
        [style.transform]="drawTransform()"
        [style.transform-origin]="'0 0'"
        (mousedown.zoneless)="onImageClick($event)"
        (contextmenu.zoneless)="$event.preventDefault()"
        (touchstart.zoneless)="onTouchStart($event)"
      >
        <img
          #drawImage
          [src]="imageSrc()"
          class="draw-image"
          (load)="onDrawImageLoad()"
          alt="Source for annotation"
        />

        <!-- SVG Overlay -->
        <svg
          class="svg-overlay"
          [attr.viewBox]="viewBox()"
        >
          @for (tr of topoRoutes(); track tr.route_id) {
            @let entry = pathsMap.get(tr.route_id);
            @if (entry) {
              @let isSelected = selectedRoute()?.route_id === tr.route_id;
              @let style = getRouteStyle(
                tr.path?.color,
                $any(tr.route.grade),
                tr.route_id
              );
              <g
                class="pointer-events-auto cursor-pointer"
                (click)="onPathInteraction($event, tr)"
                (touchstart)="onPathInteraction($event, tr)"
              >
                <!-- Thicker transparent path for much easier hit detection -->
                <polyline
                  [attr.points]="getPointsString(entry.points)"
                  fill="none"
                  stroke="transparent"
                  [attr.stroke-width]="
                    isSelected ? drawWidth() * 0.06 : drawWidth() * 0.025
                  "
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <!-- Border/Shadow Line -->
                <polyline
                  [attr.points]="getPointsString(entry.points)"
                  fill="none"
                  stroke="white"
                  [style.opacity]="style.isDashed ? 1 : 0.7"
                  [attr.stroke-width]="
                    (isSelected ? drawWidth() * 0.008 : drawWidth() * 0.005) +
                    (style.isDashed ? 2.5 : 1.5)
                  "
                  [attr.stroke-dasharray]="
                    style.isDashed
                      ? '' + drawWidth() * 0.01 + ' ' + drawWidth() * 0.01
                      : 'none'
                  "
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                />
                <polyline
                  [attr.points]="getPointsString(entry.points)"
                  fill="none"
                  [attr.stroke]="style.stroke"
                  [style.opacity]="style.opacity"
                  [attr.stroke-width]="
                    isSelected ? drawWidth() * 0.008 : drawWidth() * 0.005
                  "
                  [attr.stroke-dasharray]="
                    style.isDashed
                      ? '' + drawWidth() * 0.01 + ' ' + drawWidth() * 0.01
                      : 'none'
                  "
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                />
                <!-- End Circle (Small White) -->
                @if (entry.points[entry.points.length - 1]; as last) {
                  <circle
                    [attr.cx]="last.x * drawWidth()"
                    [attr.cy]="last.y * drawHeight()"
                    [attr.r]="
                      isSelected ? drawWidth() * 0.008 : drawWidth() * 0.005
                    "
                    fill="white"
                    [style.opacity]="style.opacity"
                    stroke="black"
                    [attr.stroke-width]="0.5"
                  />
                }
              </g>
              @if (isSelected) {
                @for (pt of entry.points; track $index) {
                  <g
                    class="cursor-move pointer-events-auto group"
                    (mousedown)="startDragging($event, tr.route_id, $index)"
                    (touchstart)="
                      startDraggingTouch($event, tr.route_id, $index)
                    "
                    (click)="$event.stopPropagation()"
                    (contextmenu)="removePoint($event, tr.route_id, $index)"
                  >
                    <circle
                      [attr.cx]="pt.x * drawWidth()"
                      [attr.cy]="pt.y * drawHeight()"
                      [attr.r]="drawWidth() * 0.012"
                      fill="rgba(0,0,0,0.4)"
                      class="hover:fill-[var(--tui-background-neutral-2)]/60 transition-colors"
                    />
                    <circle
                      [attr.cx]="pt.x * drawWidth()"
                      [attr.cy]="pt.y * drawHeight()"
                      [attr.r]="drawWidth() * 0.006"
                      [attr.fill]="style.stroke"
                      class="group-hover:scale-125 transition-transform origin-center scale-box"
                    />
                  </g>
                }
              }
            }
          }
        </svg>
      </div>
    </div>

    <!-- Mobile backdrop for sidebar -->
    @if (sidebarOpen()) {
      <div
        class="sidebar-backdrop"
        (click)="sidebarOpen.set(false)"
        (keydown.escape)="sidebarOpen.set(false)"
        role="presentation"
      ></div>
    }

    <!-- Mobile FAB toggle button -->
    <div class="fab-container">
      <button
        tuiIconButton
        appearance="primary"
        size="l"
        class="shadow-2xl rounded-full"
        (click)="sidebarOpen.set(!sidebarOpen())"
      >
        <tui-icon [icon]="sidebarOpen() ? '@tui.x' : '@tui.list'" />
      </button>
    </div>

    <!-- Sidebar -->
    <div
      class="sidebar"
      [class.translate-x-full]="!sidebarOpen()"
      [class.md:translate-x-0]="true"
      [class.shadow-2xl]="sidebarOpen()"
      [class.md:shadow-none]="true"
    >
      <tui-scrollbar class="flex-1">
        <div class="p-2 flex flex-col gap-1">
          @for (tr of topoRoutes(); track tr.route_id) {
            <button
              class="sidebar-item"
              [class.active-item]="selectedRoute()?.route_id === tr.route_id"
              (click)="selectRoute(tr)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="route-number"> {{ tr.number }}. </span>
                  <span class="font-bold text-sm truncate flex-1">
                    {{ tr.route.name }}
                  </span>
                </div>
                <div class="flex items-center gap-1 mt-1 ml-8">
                  <app-grade [grade]="tr.route.grade" size="xs" />
                </div>
              </div>
              @if (hasPath(tr.route_id)) {
                <tui-icon
                  icon="@tui.check"
                  class="text-[var(--tui-text-positive)] text-xs shrink-0 cursor-pointer hover:text-[var(--tui-text-negative)] transition-colors"
                  (click)="deletePath(tr, $event)"
                />
              }
            </button>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  styles: [
    `
      .drawer-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        cursor: grab;
      }
      .drawer-container:active {
        cursor: grabbing;
      }
      .draw-surface {
        position: relative;
        display: inline-block;
        box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
        border-radius: 0.5rem;
        user-select: none;
        transition-property: transform;
        transition-duration: 75ms;
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
      .draw-image {
        max-width: 100%;
        max-height: calc(100dvh - 5rem);
        display: block;
        pointer-events: none;
      }
      .svg-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .scale-box {
        transform-box: fill-box;
      }
      .sidebar-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background-color: var(--tui-background-backdrop);
      }
      @media (min-width: 768px) {
        .sidebar-backdrop {
          display: none;
        }
      }
      .fab-container {
        position: absolute;
        bottom: 1.5rem;
        left: 1.5rem;
        z-index: 50;
      }
      @media (min-width: 768px) {
        .fab-container {
          display: none;
        }
      }
      .sidebar {
        width: 18rem;
        flex-shrink: 0;
        border-left-width: 1px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition-property: all;
        transition-duration: 300ms;
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        z-index: 100;
        border-color: var(--tui-border-normal);
        background-color: var(--tui-background-base);
      }
      @media (min-width: 768px) {
        .sidebar {
          position: relative;
        }
      }
      .sidebar-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        text-align: left;
        transition-property: all;
        transition-duration: 200ms;
        background: transparent;
        border-radius: 12px;
        width: 100%;
        border: none;
        color: inherit;
        cursor: pointer;
      }
      .sidebar-item.active-item {
        background: var(--tui-background-neutral-1);
      }
      .route-number {
        font-size: 0.75rem;
        line-height: 1rem;
        font-weight: 700;
        opacity: 0.6;
        flex-shrink: 0;
        min-width: 1.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoDrawerComponent implements OnInit, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  imageSrc = input.required<SafeUrl>();
  topoRoutes = input.required<TopoRouteWithRoute[]>();

  // Shared state
  pathsMap = new Map<
    number,
    { points: { x: number; y: number }[]; color?: string }
  >();

  @ViewChild('drawImage') drawImageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('drawContainer') drawContainerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('drawArea') drawAreaElement!: ElementRef<HTMLDivElement>;

  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  selectedColor = signal<string | null>(null);

  drawWidth = signal(0);
  drawHeight = signal(0);
  viewBox = computed(() => `0 0 ${this.drawWidth()} ${this.drawHeight()}`);
  draggingPoint: { routeId: number; index: number } | null = null;
  sidebarOpen = signal(true);

  scale = signal(1);
  translateX = signal(0);
  translateY = signal(0);

  drawTransform = computed(
    () =>
      `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
  );

  private readonly zoomPanState: ZoomPanState = {
    scale: this.scale,
    translateX: this.translateX,
    translateY: this.translateY,
  };

  ngOnInit() {
    // Initialize paths from routes
    const routes = this.topoRoutes();
    routes.forEach((tr) => {
      if (tr.path) {
        this.pathsMap.set(tr.route_id, {
          points: [...tr.path.points],
          color: tr.path.color || this.resolveRouteColor(tr.route_id),
        });
      }
    });

    if (routes.length > 0) {
      this.selectedRoute.set(routes[0]);
    }
  }

  ngAfterViewInit(): void {
    this.doAttachWheelListener();
  }

  // --- Internal Logic ---

  private doAttachWheelListener(): void {
    if (this.drawAreaElement?.nativeElement) {
      attachWheelListener(this.drawAreaElement.nativeElement, (e) =>
        this.onWheel(e),
      );
    }
  }

  onDrawImageLoad(): void {
    const img = this.drawImageElement.nativeElement;
    this.drawWidth.set(img.clientWidth);
    this.drawHeight.set(img.clientHeight);
    this.resetZoom();
    this.doAttachWheelListener();
  }

  resetZoom(): void {
    resetZoomState(this.zoomPanState);
  }

  onWheel(event: Event): void {
    handleWheelZoom(
      event,
      this.zoomPanState,
      this.drawContainerElement.nativeElement,
      {},
      {
        afterZoom: () => {
          this.doConstrainTranslation();
          this.cdr.detectChanges();
        },
      },
    );
  }

  private doConstrainTranslation(): void {
    constrainTranslation(
      this.zoomPanState,
      this.drawAreaElement?.nativeElement,
      this.drawWidth(),
      this.drawHeight(),
    );
  }

  selectRoute(tr: TopoRouteWithRoute): void {
    this.selectedRoute.set(tr);
    const existing = this.pathsMap.get(tr.route_id);
    if (existing?.color) {
      this.selectedColor.set(existing.color);
    } else {
      this.selectedColor.set(this.resolveRouteColor(tr.route_id));
    }
  }

  resolveRouteColor(routeId: number): string {
    const route = this.topoRoutes().find((r) => r.route_id === routeId);
    if (route) {
      return getRouteColor(undefined, route.route.grade);
    }
    return GRADE_COLORS[5];
  }

  hasPath(routeId: number): boolean {
    return hasPathUtil(routeId, this.pathsMap);
  }

  getRouteStyle(
    color: string | undefined,
    grade: string | number,
    routeId: number,
  ) {
    const isSelected = this.selectedRoute()?.route_id === routeId;
    return getRouteStyleProperties(isSelected, false, color, grade);
  }

  getRouteWidth(isSelected: boolean, isHovered: boolean): number {
    return getRouteStrokeWidth(isSelected, isHovered, 30, 'editor');
  }

  getPointsString(path: { x: number; y: number }[]): string {
    return getPointsStringUtil(path, this.drawWidth(), this.drawHeight());
  }

  onImageClick(event: Event): void {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0 || this.draggingPoint) return;

    setupEditorMousePan(
      mouseEvent,
      this.zoomPanState,
      {},
      {
        onNoMove: (e) => this.addPoint(e),
        afterMove: () => {
          this.doConstrainTranslation();
          this.cdr.detectChanges();
        },
      },
    );
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route) return;

    addPointToPath(
      event,
      route.route_id,
      this.drawContainerElement.nativeElement,
      this.scale(),
      this.drawWidth(),
      this.drawHeight(),
      this.pathsMap,
      { color: this.resolveRouteColor(route.route_id) },
    );
    this.cdr.markForCheck();
  }

  startDragging(event: MouseEvent, routeId: number, index: number): void {
    this.draggingPoint = { routeId, index };

    startDragPointMouse(
      event,
      routeId,
      index,
      this.drawContainerElement.nativeElement,
      this.scale(),
      this.drawWidth(),
      this.drawHeight(),
      this.pathsMap,
      {
        onUpdate: () => this.cdr.detectChanges(),
        onEnd: () => {
          this.cdr.markForCheck();
          this.draggingPoint = null;
        },
      },
    );
  }

  deletePath(route: TopoRouteWithRoute, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('imageEditor.deletePathTitle'),
        size: 's',
        data: {
          content: this.translate.instant('imageEditor.deletePathConfirm', {
            name: route.route.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (confirmed) {
        this.pathsMap.delete(route.route_id);
        this.cdr.markForCheck();
      }
    });
  }

  onPathInteraction(event: Event, route: TopoRouteWithRoute): void {
    const selected = this.selectedRoute();

    if (selected) {
      if (selected.route_id === route.route_id) {
        event.stopPropagation();
        return;
      }
      return;
    }

    this.selectRoute(route);
    event.stopPropagation();
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    this.draggingPoint = { routeId, index };

    startDragPointTouch(
      event,
      routeId,
      index,
      this.drawContainerElement.nativeElement,
      this.scale(),
      this.drawWidth(),
      this.drawHeight(),
      this.pathsMap,
      {
        onUpdate: () => this.cdr.detectChanges(),
        onEnd: () => {
          this.cdr.markForCheck();
          this.draggingPoint = null;
        },
      },
    );
  }

  onTouchStart(event: Event): void {
    setupEditorTouchPanPinch(
      event,
      this.zoomPanState,
      this.drawContainerElement.nativeElement,
      {},
      {
        afterMove: () => {
          this.doConstrainTranslation();
          this.cdr.detectChanges();
        },
        isDraggingPoint: () => !!this.draggingPoint,
      },
    );
  }

  removePoint(event: Event, routeId: number, index: number): void {
    removePoint(event, routeId, index, this.pathsMap);
  }
}
