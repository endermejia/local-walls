import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
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
import {
  removePoint,
  addPointToPath,
  startDragPointMouse,
  startDragPointTouch,
} from '../utils/drawing.utils';
import {
  getRouteStyleProperties,
  getPointsString as getPointsStringUtil,
  hasPath as hasPathUtil,
} from '../utils/topo-styles.utils';
import {
  ZoomPanState,
  handleWheelZoom,
  constrainTranslation,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  resetZoomState,
  attachWheelListener,
} from '../utils/zoom-pan.utils';

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
          class="flex-1 relative overflow-hidden bg-[var(--tui-background-neutral-2)] flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
          #editorArea
          (wheel.zoneless)="onWheel($event)"
        >
          <div
            #container
            class="relative inline-block shadow-2xl rounded-lg select-none transition-transform duration-75 ease-out"
            [style.transform]="transform()"
            [style.transform-origin]="'0 0'"
            (mousedown.zoneless)="onImageClick($event)"
            (contextmenu.zoneless)="$event.preventDefault()"
            (touchstart.zoneless)="onTouchStart($event)"
          >
            <img
              #image
              [src]="context.data.imageUrl"
              class="max-w-[calc(100dvw-22rem)] max-h-[calc(100dvh-5rem)] block pointer-events-none"
              (load)="onImageLoad()"
              alt="Editor Background"
            />

            <!-- SVG Overlay for Paths -->
            <svg
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.viewBox]="viewBox()"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Draw all paths -->
              @for (entry of pathsMap | keyvalue; track entry.key) {
                @let isSelected = selectedRoute()?.route_id === +entry.key;
                @let style =
                  getRouteStyle(
                    entry.value.color,
                    entry.value._ref.route.grade.toString(),
                    +entry.key
                  );
                <g
                  class="pointer-events-auto cursor-pointer"
                  (click)="
                    selectRoute(entry.value._ref || { route_id: +entry.key });
                    $event.stopPropagation()
                  "
                  (touchstart)="
                    selectRoute(entry.value._ref || { route_id: +entry.key });
                    $event.stopPropagation()
                  "
                >
                  <!-- Thicker transparent path for much easier hit detection -->
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="
                      isSelected ? width() * 0.06 : width() * 0.025
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <!-- Border/Shadow Line -->
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    stroke="white"
                    [style.opacity]="style.isDashed ? 1 : 0.7"
                    [attr.stroke-width]="
                      (isSelected ? width() * 0.008 : width() * 0.005) +
                      (style.isDashed ? 2.5 : 1.5)
                    "
                    [attr.stroke-dasharray]="
                      style.isDashed
                        ? '' + width() * 0.01 + ' ' + width() * 0.01
                        : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    [attr.stroke]="style.stroke"
                    [style.opacity]="style.opacity"
                    [attr.stroke-width]="
                      isSelected ? width() * 0.008 : width() * 0.005
                    "
                    [attr.stroke-dasharray]="
                      style.isDashed
                        ? '' + width() * 0.01 + ' ' + width() * 0.01
                        : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  <!-- End Circle (Small White) -->
                  @if (
                    entry.value.points[entry.value.points.length - 1];
                    as last
                  ) {
                    <circle
                      [attr.cx]="last.x * width()"
                      [attr.cy]="last.y * height()"
                      [attr.r]="isSelected ? width() * 0.008 : width() * 0.005"
                      fill="white"
                      [style.opacity]="style.opacity"
                      stroke="black"
                      [attr.stroke-width]="0.5"
                    />
                  }
                </g>

                <!-- Control Points -->
                @if (isSelected) {
                  @for (pt of entry.value.points; track $index) {
                    <g
                      class="cursor-move group"
                      (mousedown)="startDragging($event, entry.key, $index)"
                      (touchstart)="
                        startDraggingTouch($event, entry.key, $index)
                      "
                      (contextmenu)="removePoint($event, entry.key, $index)"
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
                        [attr.fill]="style.stroke"
                        class="group-hover:scale-125 transition-transform origin-center"
                        style="transform-box: fill-box"
                      />
                      <!-- Point Number Bubble -->
                      @if ($index === 0) {
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height() - width() * 0.02"
                          [attr.r]="width() * 0.01"
                          fill="var(--tui-background-base)"
                        />
                        <text
                          [attr.x]="pt.x * width()"
                          [attr.y]="pt.y * height() - width() * 0.016"
                          text-anchor="middle"
                          fill="var(--tui-text-01)"
                          [attr.font-size]="width() * 0.01"
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
export class TopoPathEditorDialogComponent implements AfterViewInit {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, TopoPathEditorConfig>>();
  private readonly topos = inject(ToposService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly global = inject(GlobalData);

  @ViewChild('image') imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('container') containerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('editorArea') editorAreaElement!: ElementRef<HTMLDivElement>;

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

  draggingPoint: { routeId: number; index: number } | null = null;
  scale = signal(1);
  translateX = signal(0);
  translateY = signal(0);
  isPanning = signal(false);

  // Zoom/Pan state adapter
  private readonly zoomPanState: ZoomPanState = {
    scale: this.scale,
    translateX: this.translateX,
    translateY: this.translateY,
  };

  transform = computed(
    () =>
      `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
  );

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

  ngAfterViewInit(): void {
    this.doAttachWheelListener();
  }

  private doAttachWheelListener(): void {
    attachWheelListener(this.editorAreaElement?.nativeElement, (e) =>
      this.onWheel(e),
    );
  }

  onImageLoad(): void {
    const img = this.imageElement.nativeElement;
    this.width.set(img.clientWidth);
    this.height.set(img.clientHeight);
    this.resetZoom();

    // Try attaching again if not attached yet
    this.doAttachWheelListener();
  }

  resetZoom(): void {
    resetZoomState(this.zoomPanState);
  }

  onWheel(event: Event): void {
    handleWheelZoom(
      event,
      this.zoomPanState,
      this.containerElement.nativeElement,
      {},
      { afterZoom: () => this.doConstrainTranslation() },
    );
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

  private doConstrainTranslation(): void {
    constrainTranslation(
      this.zoomPanState,
      this.editorAreaElement?.nativeElement,
      this.width(),
      this.height(),
    );
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
    return hasPathUtil(routeId, this.pathsMap);
  }

  getPointsString(pathData: {
    points: { x: number; y: number }[];
    color?: string;
  }): string {
    return getPointsStringUtil(pathData.points, this.width(), this.height());
  }

  getRouteStyle(
    color: string | undefined,
    grade: string | number,
    routeId: number,
  ) {
    const isSelected = this.selectedRoute()?.route_id === routeId;
    return getRouteStyleProperties(isSelected, false, color, grade);
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
        afterMove: () => this.doConstrainTranslation(),
      },
    );
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route) return;

    addPointToPath(
      event,
      route.route_id,
      this.containerElement.nativeElement,
      this.scale(),
      this.width(),
      this.height(),
      this.pathsMap,
      { _ref: route },
    );
  }

  startDragging(event: MouseEvent, routeId: number, index: number): void {
    const numericRouteId = +routeId;
    this.draggingPoint = { routeId: numericRouteId, index };

    startDragPointMouse(
      event,
      numericRouteId,
      index,
      this.containerElement.nativeElement,
      this.scale(),
      this.width(),
      this.height(),
      this.pathsMap,
      { onEnd: () => (this.draggingPoint = null) },
    );
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    const numericRouteId = +routeId;
    this.draggingPoint = { routeId: numericRouteId, index };

    startDragPointTouch(
      event,
      numericRouteId,
      index,
      this.containerElement.nativeElement,
      this.scale(),
      this.width(),
      this.height(),
      this.pathsMap,
      {
        onLongPress: () => {
          this.removePoint(event, numericRouteId, index);
          this.draggingPoint = null;
        },
        onEnd: () => (this.draggingPoint = null),
      },
    );
  }

  onTouchStart(event: Event): void {
    setupEditorTouchPanPinch(
      event,
      this.zoomPanState,
      this.containerElement.nativeElement,
      {},
      {
        afterMove: () => this.doConstrainTranslation(),
        isDraggingPoint: () => !!this.draggingPoint,
      },
    );
  }

  removePoint(event: Event, routeId: number, index: number): void {
    removePoint(event, routeId, index, this.pathsMap);
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
