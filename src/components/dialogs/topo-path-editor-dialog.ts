import { CommonModule } from '@angular/common';
import { TopoHasPathPipe } from '../../pipes/topo-path.pipe';
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
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { GradeComponent } from '../ui/avatar-grade';

import {
  TopoRouteWithRoute,
  TopoPath,
  TopoPathEditorResult,
} from '../../models';

import {
  removePoint,
  addPointToPath,
  startDragPointMouse,
  startDragPointTouch,
} from '../../utils/drawing.utils';
import {
  getRouteStyleProperties,
  getPointsString as getPointsStringUtil,
} from '../../utils/topo-styles.utils';
import {
  handleWheelZoom,
  constrainTranslation,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  attachWheelListener,
} from '../../utils/zoom-pan.utils';

export interface TopoPathEditorConfig {
  imageUrl: string;
  topoRoutes: TopoRouteWithRoute[];
  topoName?: string;
  topoId?: number; // Needed if standalone = true
  // If true, the dialog saves directly to database via ToposService
  standalone?: boolean;
}

@Component({
  selector: 'app-topo-path-editor-dialog',
  standalone: true,
  imports: [
    TopoHasPathPipe,
    CommonModule,
    TuiIcon,
    TuiButton,
    TuiLoader,
    GradeComponent,
    TranslateModule,
    TuiScrollbar,
  ],
  template: `
    <div class="editor-root">
      <!-- ═════════════════════ BODY (canvas + sidebar) ═════════════════════ -->
      <div class="editor-body">
        <!-- ── ROUTE SIDEBAR ── -->
        <aside class="route-sidebar" [class.sidebar-open]="sidebarOpen()">
          <div class="sidebar-inner">
            <p class="sidebar-label">{{ 'routes' | translate }}</p>
            <tui-scrollbar class="sidebar-scroll">
              <div class="route-list">
                @for (tr of topoRoutes; track tr.route_id) {
                  <button
                    class="route-item"
                    [class.route-item--active]="
                      selectedRoute()?.route_id === tr.route_id
                    "
                    [attr.aria-label]="tr.route.name"
                    (click)="selectRoute(tr, true)"
                  >
                    <div class="route-num">{{ tr.number }}</div>
                    <div class="route-info">
                      <div class="route-name">{{ tr.route.name }}</div>
                    </div>
                    <app-grade [grade]="tr.route.grade" size="s" />
                    @if (tr.route_id | topoHasPath: pathsMap) {
                      <tui-icon icon="@tui.check" class="path-check" />
                    }
                  </button>
                }
              </div>
            </tui-scrollbar>

            <!-- Tips (desktop only) -->
            <div class="tips">
              <p class="tip">
                <tui-icon icon="@tui.mouse-pointer-2" class="tip-icon" />
                {{ 'topos.editor.addPoint' | translate }}
              </p>
              <p class="tip">
                <tui-icon icon="@tui.move" class="tip-icon" />
                {{ 'topos.editor.movePoint' | translate }}
              </p>
              <p class="tip tip--danger">
                <tui-icon icon="@tui.trash" class="tip-icon--danger" />
                {{ 'topos.editor.deletePoint' | translate }}
              </p>
            </div>
          </div>
        </aside>

        <!-- Mobile backdrop -->
        @if (sidebarOpen()) {
          <div
            class="mobile-backdrop"
            (click)="sidebarOpen.set(false)"
            role="presentation"
          ></div>
        }

        <!-- ── CANVAS AREA ── -->
        <div class="canvas-area" #editorArea (wheel.zoneless)="onWheel($event)">
          <div
            #container
            class="canvas-container"
            [style.transform]="transform()"
            [style.transform-origin]="'0 0'"
            [style.width.px]="width()"
            [style.height.px]="height()"
            (mousedown.zoneless)="onImageClick($event)"
            (contextmenu.zoneless)="$event.preventDefault()"
            (touchstart.zoneless)="onTouchStart($event)"
          >
            <img
              #image
              [src]="context.data.imageUrl"
              class="topo-image"
              (load)="onImageLoad()"
              alt="Topo background"
            />

            <!-- SVG Paths Overlay -->
            <svg
              class="svg-overlay"
              [attr.viewBox]="viewBox()"
              xmlns="http://www.w3.org/2000/svg"
            >
              @for (entry of pathsMap | keyvalue; track entry.key) {
                @let isSelected = selectedRoute()?.route_id === +entry.key;
                @let style =
                  getRouteStyle(
                    entry.value.color,
                    entry.value._ref.route.grade.toString(),
                    +entry.key
                  );
                <g
                  class="path-group"
                  (click)="
                    selectRoute(entry.value._ref || { route_id: +entry.key });
                    $event.stopPropagation()
                  "
                  (touchstart)="
                    selectRoute(entry.value._ref || { route_id: +entry.key });
                    $event.stopPropagation()
                  "
                >
                  <!-- Hit area -->
                  <polyline
                    [attr.points]="getPointsString(entry.value)"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="
                      isSelected ? width() * 0.06 : width() * 0.03
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <!-- Shadow -->
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
                        ? width() * 0.01 + ' ' + width() * 0.01
                        : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <!-- Main line -->
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
                        ? width() * 0.01 + ' ' + width() * 0.01
                        : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <!-- End dot -->
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
                      stroke-width="0.5"
                    />
                  }
                </g>

                <!-- Control points (selected only) -->
                @if (isSelected) {
                  @for (pt of entry.value.points; track $index) {
                    <g
                      class="control-point"
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
                      />
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        [attr.r]="width() * 0.006"
                        [attr.fill]="style.stroke"
                      />
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
                          fill="var(--tui-text-primary)"
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

          <!-- Loading overlay -->
          @if (loading()) {
            <div class="loading-overlay">
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>

        <!-- Mobile FAB to toggle sidebar -->
        <button
          tuiIconButton
          appearance="primary"
          size="m"
          class="fab-routes"
          (click)="sidebarOpen.set(!sidebarOpen())"
        >
          <tui-icon [icon]="sidebarOpen() ? '@tui.x' : '@tui.list'" />
        </button>
      </div>

      <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
      <footer class="editor-footer">
        <div class="footer-actions-left">
          <button
            tuiButton
            type="button"
            appearance="secondary"
            size="m"
            (click)="close()"
          >
            {{ 'cancel' | translate }}
          </button>
        </div>

        <div class="footer-actions-right">
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="m"
            [disabled]="loading()"
            (click)="sortByPosition()"
          >
            <tui-icon icon="@tui.list-ordered" class="mr-1" />
            <span>{{ 'topos.editor.sort' | translate }}</span>
          </button>

          <button
            tuiButton
            type="button"
            appearance="primary"
            size="m"
            [disabled]="loading()"
            (click)="saveAll()"
          >
            {{ 'save' | translate }}
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 10000;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── Root layout ── */
    .editor-root {
      display: flex;
      flex-direction: column;
      width: 100dvw;
      height: 100dvh;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      color: var(--tui-text-primary);
    }

    /* ── Footer ── */
    .editor-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      flex-shrink: 0;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      gap: 1rem;
      position: relative;
      z-index: 50;
    }

    .footer-actions-left,
    .footer-actions-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Hide sort button text on very small screens if necessary */
    @media (max-width: 480px) {
      .footer-actions-right span {
        display: none;
      }
      .footer-actions-right button {
        min-width: 2.5rem;
        padding: 0 0.5rem;
      }
    }

    /* ── Body ── */
    .editor-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ── Sidebar ── */
    .route-sidebar {
      width: 19rem;
      flex-shrink: 0;
      border-right: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 20;
      transition: transform 0.2s ease;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .sidebar-label {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.45;
      padding: 1.25rem 1.25rem 0.5rem;
      flex-shrink: 0;
    }

    .sidebar-scroll {
      flex: 1;
      overflow: hidden;
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem 1rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      text-align: left;
      width: 100%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid transparent;
      background: var(--tui-background-base);
      color: inherit;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .route-item:hover {
      background: var(--tui-background-neutral-1-hover);
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--tui-border-hover);
    }

    .route-item--active {
      background: var(--tui-background-accent-2) !important;
      color: var(--tui-text-primary-on-accent-2) !important;
      border-color: transparent !important;
      box-shadow: 0 4px 15px var(--tui-background-accent-2-half) !important;
      transform: translateX(4px);
    }

    .route-num {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
      background: var(--tui-background-neutral-2);
      border: 1px solid var(--tui-border-normal);
      transition: all 0.2s ease;
    }

    .route-item--active .route-num {
      background: var(--tui-background-accent-1);
      color: var(--tui-text-primary-on-accent-1);
      border-color: transparent;
    }

    .route-info {
      flex: 1;
      min-width: 0;
    }
    .route-name {
      font-weight: 700;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }
    .route-grade {
      font-size: 0.75rem;
      opacity: 0.55;
      font-weight: 600;
    }

    .route-item--active .route-grade {
      opacity: 0.85;
    }

    .path-check {
      color: var(--tui-text-positive);
      font-size: 0.875rem;
      flex-shrink: 0;
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.1));
    }

    .route-item--active .path-check {
      color: white;
    }

    .tips {
      flex-shrink: 0;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.03);
    }

    .tip,
    .tip--danger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      opacity: 0.65;
    }

    .tip--danger {
      opacity: 0.8;
    }
    .tip-icon {
      color: var(--tui-text-accent-1);
      font-size: 0.875rem;
    }
    .tip-icon--danger {
      color: var(--tui-text-negative);
      font-size: 0.875rem;
    }

    /* ── Mobile sidebar overlay ── */
    @media (max-width: 767px) {
      .route-sidebar {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 80vw;
        max-width: 18rem;
        transform: translateX(100%);
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
      }

      .route-sidebar.sidebar-open {
        transform: translateX(0);
      }

      .tips {
        display: none;
      }

      .fab-routes {
        display: flex !important;
      }
    }

    @media (min-width: 768px) {
      .route-sidebar {
        transform: none !important;
      }

      .fab-routes {
        display: none !important;
      }

      .mobile-backdrop {
        display: none !important;
      }
    }

    /* ── Mobile backdrop ── */
    .mobile-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 15;
    }

    /* ── FAB ── */
    .fab-routes {
      position: absolute;
      bottom: 1.25rem;
      right: 1.25rem;
      z-index: 30;
      border-radius: 50% !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: none;
    }

    @media (max-width: 767px) {
      .fab-routes {
        bottom: 1rem;
      }
    }

    /* ── Canvas area ── */
    .canvas-area {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      cursor: grab;
    }

    .canvas-area:active {
      cursor: grabbing;
    }

    .canvas-container {
      position: absolute;
      top: 0;
      left: 0;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
      border-radius: 0.5rem;
      overflow: hidden;
      transform-origin: 0 0;
      transition: transform 75ms ease-out;
      line-height: 0;
    }

    .topo-image {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      user-select: none;
      object-fit: cover;
    }

    .svg-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .path-group {
      pointer-events: auto;
      cursor: pointer;
    }
    .control-point {
      cursor: move;
      pointer-events: auto;
    }

    /* ── Loading overlay ── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoPathEditorDialogComponent implements AfterViewInit {
  protected readonly context =
    injectContext<
      TuiDialogContext<TopoPathEditorResult | boolean, TopoPathEditorConfig>
    >();
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
  sidebarOpen = signal(false);
  topoRoutes: TopoRouteWithRoute[] = [];
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
  private readonly zoomPanState = {
    scale: this.scale,
    translateX: this.translateX,
    translateY: this.translateY,
  };

  transform = computed(
    () =>
      `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
  );

  constructor() {
    this.topoRoutes = [...this.context.data.topoRoutes];
    // Initialize paths from existing data
    this.topoRoutes.forEach((tr) => {
      if (tr.path) {
        this.pathsMap.set(tr.route_id, {
          points: [...tr.path.points],
          color: tr.path.color,
          _ref: tr,
        });
      }
    });

    // Select first route by default
    if (this.topoRoutes.length > 0) {
      this.selectedRoute.set(this.topoRoutes[0]);
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
    const area = this.editorAreaElement.nativeElement;

    // Use natural dimensions for the coordinate system
    this.width.set(img.naturalWidth);
    this.height.set(img.naturalHeight);

    // Calculate initial fit scale
    const scaleX = area.clientWidth / img.naturalWidth;
    const scaleY = area.clientHeight / img.naturalHeight;
    const initialScale = Math.min(scaleX, scaleY, 1);

    this.scale.set(initialScale);
    this.translateX.set(0);
    this.translateY.set(0);
    this.doConstrainTranslation();

    // Try attaching again if not attached yet
    this.doAttachWheelListener();
  }

  resetZoom(): void {
    this.onImageLoad(); // Re-fit
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
      const routesWithX = this.topoRoutes.map((tr) => {
        const pathData = this.pathsMap.get(tr.route_id);
        const points = pathData?.points || tr.path?.points || [];
        const minX =
          points.length > 0 ? Math.min(...points.map((p) => p.x)) : 999;
        return { tr, minX };
      });

      // 2. Sort by minX
      routesWithX.sort((a, b) => a.minX - b.minX);

      // 3. Update numbers locally (starting from 1)
      for (let i = 0; i < routesWithX.length; i++) {
        const tr = routesWithX[i].tr;
        tr.number = i + 1;
      }

      // 4. Sort the original array to reflect changes in sidebar
      this.topoRoutes = [...this.topoRoutes].sort(
        (a, b) => a.number - b.number,
      );

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
    // Map mutations are not detected by OnPush — manually trigger re-render
    this.cdr.markForCheck();
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
      {
        onUpdate: () => this.cdr.markForCheck(),
        onEnd: () => {
          this.draggingPoint = null;
          this.cdr.markForCheck();
        },
      },
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
    this.cdr.markForCheck();
  }

  close(): void {
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const pathsToUpdate = Array.from(this.pathsMap.entries()).map(
        ([routeId, path]) => ({
          routeId,
          path: { points: path.points, color: path.color } as TopoPath,
        }),
      );

      if (!this.context.data.standalone) {
        // Return paths to caller
        this.context.completeWith({
          saved: true,
          paths: pathsToUpdate,
          routeIds: this.topoRoutes.map((tr) => tr.route_id),
        });
        return;
      }

      const topoId = this.context.data.topoId;
      if (!topoId) throw new Error('Missing topoId for database saving');

      if (pathsToUpdate.length > 0) {
        await this.topos.bulkUpdateRoutePaths(topoId, pathsToUpdate, false);
      }

      for (const tr of this.topoRoutes) {
        await this.topos.updateRouteOrder(
          topoId,
          tr.route_id,
          tr.number,
          false,
        );
      }

      this.global.topoDetailResource.reload();
      this.toast.success('messages.toasts.pathsSaved');
      this.context.completeWith(true);
    } catch (error) {
      console.error('Error saving paths:', error);
      this.toast.error('messages.errors.savingPaths');
    } finally {
      this.loading.set(false);
    }
  }
}
