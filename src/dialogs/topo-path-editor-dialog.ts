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
import { AvatarGradeComponent } from '../components/avatar-grade';
import { GlobalData, ToastService, ToposService } from '../services';
import { removePoint } from '../utils/drawing.utils';
import { getRouteStyleProperties } from '../utils/topo-styles.utils';

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
    AvatarGradeComponent,
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
                    <app-avatar-grade [grade]="tr.route.grade" size="s" />
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
          class="flex-1 relative overflow-hidden bg-[var(--tui-background-neutral-2)] flex items-center justify-center p-8 cursor-move"
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
              class="max-w-[70dvw] max-h-[80dvh] block pointer-events-none"
              (load)="onImageLoad()"
              alt="Editor Background"
            />

            <!-- SVG Overlay for Paths -->
            <svg
              class="absolute inset-0 w-full h-full cursor-crosshair pointer-events-none"
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
                    [attr.stroke-width]="isSelected ? 0.08 : 0.04"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    [attr.stroke]="style.stroke"
                    [style.opacity]="style.opacity"
                    [attr.stroke-width]="isSelected ? 4 : 2"
                    [attr.stroke-dasharray]="style.isDashed ? '4 4' : 'none'"
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
                      (touchstart)="
                        startDraggingTouch($event, entry.key, $index)
                      "
                      (contextmenu)="removePoint($event, entry.key, $index)"
                    >
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        r="12"
                        fill="rgba(0,0,0,0.4)"
                        class="hover:fill-[var(--tui-background-neutral-2)]/60 transition-colors"
                      />
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        r="6"
                        [attr.fill]="style.stroke"
                        class="group-hover:scale-125 transition-transform origin-center"
                        style="transform-box: fill-box"
                      />
                      <!-- Point Number Bubble -->
                      @if ($index === 0) {
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height() - 20"
                          r="10"
                          fill="var(--tui-background-base)"
                        />
                        <text
                          [attr.x]="pt.x * width()"
                          [attr.y]="pt.y * height() - 16"
                          text-anchor="middle"
                          fill="var(--tui-text-01)"
                          font-size="10"
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
    this.attachWheelListener();
  }

  private attachWheelListener(): void {
    const area = this.editorAreaElement?.nativeElement;
    if (area && !('_wheelAttached' in area)) {
      area.addEventListener('wheel', (e) => this.onWheel(e), {
        passive: false,
      });
      (area as { _wheelAttached?: boolean })._wheelAttached = true;
    }
  }

  onImageLoad(): void {
    const img = this.imageElement.nativeElement;
    this.width.set(img.clientWidth);
    this.height.set(img.clientHeight);
    this.resetZoom();

    // Try attaching again if not attached yet
    this.attachWheelListener();
  }

  resetZoom(): void {
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
  }

  onWheel(event: Event): void {
    const wheelEvent = event as WheelEvent;

    if (wheelEvent.cancelable) {
      wheelEvent.preventDefault();
    }

    const zoomSpeed = 0.15;
    const delta = wheelEvent.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.min(Math.max(1, this.scale() + delta), 5);

    if (newScale === this.scale()) return;

    const rect = this.containerElement.nativeElement.getBoundingClientRect();

    // We need the mouse position relative to the container *before* the new scale is applied.
    // event.clientX/Y are in viewport coordinates.
    const x = wheelEvent.clientX - rect.left;
    const y = wheelEvent.clientY - rect.top;

    // Normalize mouse position relative to current scale/translation
    const mouseX = x / this.scale();
    const mouseY = y / this.scale();

    this.scale.set(newScale);

    // Update translations to keep the point under the mouse fixed.
    // The new translation is the mouse position in viewport minus its position in the new scaled coordinates.
    this.translateX.update(
      (tx) => wheelEvent.clientX - rect.left + tx - mouseX * newScale,
    );
    this.translateY.update(
      (ty) => wheelEvent.clientY - rect.top + ty - mouseY * newScale,
    );

    this.constrainTranslation();
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

  private constrainTranslation(): void {
    const scale = this.scale();
    const container = this.containerElement.nativeElement;
    const area = this.editorAreaElement.nativeElement;

    if (scale <= 1) {
      this.translateX.set(0);
      this.translateY.set(0);
      return;
    }

    const areaRect = area.getBoundingClientRect();
    const width = this.width();
    const height = this.height();

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    // Limit translations so the image doesn't leave the view if it's larger than the view.
    // If it's smaller than the view, we center it or keep it at 0.
    let minX = 0;
    let maxX = 0;
    if (scaledWidth > areaRect.width) {
      minX = areaRect.width - scaledWidth;
      maxX = 0;
    } else {
      // If smaller, we center it relative to the initial centered position.
      // But since we use transform-origin 0 0, it's easier to just allow some movement or keep it centered.
      // For now, let's just keep it at 0 if it fits.
      minX = 0;
      maxX = 0;
    }

    let minY = 0;
    let maxY = 0;
    if (scaledHeight > areaRect.height) {
      minY = areaRect.height - scaledHeight;
      maxY = 0;
    } else {
      minY = 0;
      maxY = 0;
    }

    // Since we are in a flex center container, the initial position is already centered.
    // BUT transform-origin is 0 0, which refers to the top-left of the image.
    // If the image is 100x100 and area is 500x500, the top-left is at (200, 200).
    // translateX(0) scale(1) means top-left at (200, 200).
    // If we want to constrain, we should be careful about coordinates.
    // Actually, let's just allow panning freely for now if the user wants, but limited to not losing the image.

    this.translateX.update((x) => Math.min(maxX, Math.max(x, minX)));
    this.translateY.update((y) => Math.min(maxY, Math.max(y, minY)));
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

  getPointsString(pathData: {
    points: { x: number; y: number }[];
    color?: string;
  }): string {
    return pathData.points
      .map((p) => `${p.x * this.width()},${p.y * this.height()}`)
      .join(' ');
  }

  getRouteStyle(color: string | undefined, grade: string, routeId: number) {
    const isSelected = this.selectedRoute()?.route_id === routeId;
    return getRouteStyleProperties(isSelected, false, color, grade);
  }

  onImageClick(event: Event): void {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0 || this.draggingPoint) return;

    const startX = mouseEvent.clientX;
    const startY = mouseEvent.clientY;
    const initialTx = this.translateX();
    const initialTy = this.translateY();
    let hasMoved = false;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        this.translateX.set(initialTx + dx);
        this.translateY.set(initialTy + dy);
        this.constrainTranslation();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!hasMoved) {
        this.addPoint(e);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route) return;

    const rect = this.containerElement.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale();
    const y = (event.clientY - rect.top) / this.scale();

    const coords = {
      x: Math.max(0, Math.min(1, x / this.width())),
      y: Math.max(0, Math.min(1, y / this.height())),
    };

    const current = this.pathsMap.get(route.route_id) || {
      points: [],
      _ref: route,
    };
    this.pathsMap.set(route.route_id, {
      ...current,
      points: [...current.points, coords],
    });
  }

  startDragging(event: MouseEvent, routeId: number, index: number): void {
    const numericRouteId = +routeId;
    this.draggingPoint = { routeId: numericRouteId, index };

    const onMouseMove = (e: MouseEvent) => {
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale();
      const y = (e.clientY - rect.top) / this.scale();

      const coords = {
        x: Math.max(0, Math.min(1, x / this.width())),
        y: Math.max(0, Math.min(1, y / this.height())),
      };

      const pathData = this.pathsMap.get(numericRouteId);
      if (pathData) {
        pathData.points[index] = coords;
        this.pathsMap.set(numericRouteId, { ...pathData });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.draggingPoint = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    event.stopPropagation();
    event.preventDefault();
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    const numericRouteId = +routeId;
    this.draggingPoint = { routeId: numericRouteId, index };

    const startX = event.touches[0].clientX;
    const startY = event.touches[0].clientY;
    let isLongPress = false;

    const longPressTimeout = setTimeout(() => {
      isLongPress = true;
      this.removePoint(event, numericRouteId, index);
      this.draggingPoint = null;
      cleanup();
    }, 600);

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dist = Math.sqrt(
        Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2),
      );

      if (dist > 10) {
        clearTimeout(longPressTimeout);
      }

      if (isLongPress) return;

      e.preventDefault();
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale();
      const y = (touch.clientY - rect.top) / this.scale();

      const coords = {
        x: Math.max(0, Math.min(1, x / this.width())),
        y: Math.max(0, Math.min(1, y / this.height())),
      };

      const pathData = this.pathsMap.get(numericRouteId);
      if (pathData) {
        pathData.points[index] = coords;
        this.pathsMap.set(numericRouteId, { ...pathData });
      }
    };

    const onTouchEnd = () => {
      clearTimeout(longPressTimeout);
      cleanup();
      if (!isLongPress) {
        this.draggingPoint = null;
      }
    };

    const cleanup = () => {
      window.removeEventListener(
        'touchmove',
        onTouchMove as EventListenerOrEventListenerObject,
      );
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    event.stopPropagation();
    event.preventDefault();
  }

  onTouchStart(event: Event): void {
    const touchEvent = event as TouchEvent;
    if (touchEvent.touches.length === 1 && !this.draggingPoint) {
      // Single touch - potentially panning
      const startX = touchEvent.touches[0].clientX;
      const startY = touchEvent.touches[0].clientY;
      const initialTX = this.translateX();
      const initialTY = this.translateY();

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1 || this.draggingPoint) return;
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;

        this.translateX.set(initialTX + deltaX);
        this.translateY.set(initialTY + deltaY);
        this.constrainTranslation();
      };

      const onTouchEnd = () => {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    } else if (touchEvent.touches.length === 2) {
      // Pinch to zoom
      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2),
        );

      const getCenter = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      });

      const initialDist = getDistance(
        touchEvent.touches[0],
        touchEvent.touches[1],
      );
      const initialScale = this.scale();
      const initialCenter = getCenter(
        touchEvent.touches[0],
        touchEvent.touches[1],
      );
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const centerRelX = initialCenter.x - rect.left;
      const centerRelY = initialCenter.y - rect.top;
      const mouseX = centerRelX / initialScale;
      const mouseY = centerRelY / initialScale;

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        const dist = getDistance(e.touches[0], e.touches[1]);
        const newScale = Math.min(
          Math.max(1, (dist / initialDist) * initialScale),
          5,
        );

        this.scale.set(newScale);

        // Keep the point under initial center fixed in viewport coordinates
        this.translateX.update(
          (tx) => initialCenter.x - rect.left + tx - mouseX * newScale,
        );
        this.translateY.update(
          (ty) => initialCenter.y - rect.top + ty - mouseY * newScale,
        );

        this.constrainTranslation();
      };

      const onTouchEnd = () => {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
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
