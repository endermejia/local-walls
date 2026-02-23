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
import {
  getNormalizedPosition,
  setupMouseDrag,
  setupTouchDrag,
  removePoint,
} from '../utils/drawing.utils';
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
    TranslatePipe,
    AvatarGradeComponent,
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
          class="flex-1 relative overflow-hidden bg-black flex items-center justify-center p-8"
        >
          <div
            #container
            class="relative inline-block shadow-2xl rounded-lg overflow-hidden select-none"
            (mousedown)="onImageClick($event)"
            (contextmenu)="$event.preventDefault()"
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
              class="absolute inset-0 w-full h-full cursor-crosshair"
              [attr.viewBox]="viewBox()"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Draw all paths -->
              @for (entry of pathsMap | keyvalue; track entry.key) {
                @let isSelected = selectedRoute()?.route_id === +entry.key;
                @let style =
                  getRouteStyle(
                    entry.value.color,
                    $any(entry.value._ref.route.grade),
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
                        class="group-hover:scale-125 transition-transform"
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
export class TopoPathEditorDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, TopoPathEditorConfig>>();
  private readonly topos = inject(ToposService);
  private readonly toast = inject(ToastService);

  @ViewChild('image') imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('container') containerElement!: ElementRef<HTMLDivElement>;

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

  onImageClick(event: MouseEvent): void {
    if (event.button !== 0 || this.draggingPoint) return;

    const route = this.selectedRoute();
    if (!route) return;

    const coords = getNormalizedPosition(
      event.clientX,
      event.clientY,
      this.containerElement.nativeElement.getBoundingClientRect(),
    );

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

    setupMouseDrag(event, this.containerElement.nativeElement, {
      onDrag: (coords) => {
        const pathData = this.pathsMap.get(numericRouteId);
        if (pathData) {
          pathData.points[index] = coords;
          this.pathsMap.set(numericRouteId, { ...pathData });
        }
      },
      onEnd: () => {
        this.draggingPoint = null;
      },
    });
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    const numericRouteId = +routeId;
    this.draggingPoint = { routeId: numericRouteId, index };

    setupTouchDrag(
      event,
      this.containerElement.nativeElement,
      {
        onDrag: (coords) => {
          const pathData = this.pathsMap.get(numericRouteId);
          if (pathData) {
            pathData.points[index] = coords;
            this.pathsMap.set(numericRouteId, { ...pathData });
          }
        },
        onEnd: () => {
          this.draggingPoint = null;
        },
        onLongPress: () => {
          this.removePoint(event, numericRouteId, index);
          this.draggingPoint = null;
        },
      },
      { longPressDelay: 600, moveThreshold: 10 },
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
      for (const [routeId, path] of this.pathsMap.entries()) {
        await this.topos.updateRoutePath(topo.id, routeId, path);
      }
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
