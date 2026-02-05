import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  Inject,
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
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
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
      <div class="flex items-center justify-between p-4 shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md">
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
        <div class="w-80 shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-sm flex flex-col">
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
                {{ 'topos.editor.addPoint' | translate }}
              </p>
              <p class="flex items-center gap-2">
                <tui-icon icon="@tui.move" class="text-primary" />
                {{ 'topos.editor.movePoint' | translate }}
              </p>
              <p class="flex items-center gap-2">
                <tui-icon icon="@tui.trash" class="text-red-400" />
                {{ 'topos.editor.deletePoint' | translate }}
              </p>
            </div>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="flex-1 relative overflow-hidden bg-black flex items-center justify-center p-8">
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
                <polyline
                  [attr.points]="getPointsString(entry.value)"
                  fill="none"
                  [attr.stroke]="isSelected ? 'var(--tui-primary)' : 'rgba(255,255,255,0.4)'"
                  [attr.stroke-width]="isSelected ? 4 : 2"
                  [attr.stroke-dasharray]="isSelected ? 'none' : '4 4'"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="pointer-events-none transition-all duration-300"
                />

                <!-- Control Points -->
                @if (isSelected) {
                  @for (pt of entry.value; track $index) {
                    <g
                      class="cursor-move group"
                      (mousedown)="startDragging($event, +entry.key, $index)"
                      (contextmenu)="removePoint($event, +entry.key, $index)"
                    >
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        r="12"
                        fill="rgba(0,0,0,0.4)"
                        class="hover:fill-black/60 transition-colors"
                      />
                      <circle
                        [attr.cx]="pt.x * width()"
                        [attr.cy]="pt.y * height()"
                        r="6"
                        [attr.fill]="'var(--tui-primary)'"
                        class="group-hover:scale-125 transition-transform"
                      />
                      <!-- Point Number Bubble -->
                      @if ($index === 0) {
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height() - 20"
                          r="10"
                          fill="white"
                        />
                        <text
                          [attr.x]="pt.x * width()"
                          [attr.y]="pt.y * height() - 16"
                          text-anchor="middle"
                          fill="black"
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

  loading = signal(false);
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  pathsMap = new Map<number, { x: number; y: number }[]>();

  width = signal(0);
  height = signal(0);
  viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  draggingPoint: { routeId: number; index: number } | null = null;

  constructor() {
    // Initialize paths from existing data
    this.context.data.topo.topo_routes.forEach((tr) => {
      if (tr.path) {
        this.pathsMap.set(tr.route_id, [...tr.path]);
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

  selectRoute(tr: TopoRouteWithRoute): void {
    this.selectedRoute.set(tr);
  }

  hasPath(routeId: number): boolean {
    const path = this.pathsMap.get(routeId);
    return !!path && path.length > 0;
  }

  getPointsString(path: { x: number; y: number }[]): string {
    return path
      .map((p) => `${p.x * this.width()},${p.y * this.height()}`)
      .join(' ');
  }

  onImageClick(event: MouseEvent): void {
    if (event.button !== 0 || this.draggingPoint) return;

    const route = this.selectedRoute();
    if (!route) return;

    const rect = this.containerElement.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const currentPath = this.pathsMap.get(route.route_id) || [];
    this.pathsMap.set(route.route_id, [...currentPath, { x, y }]);
  }

  startDragging(event: MouseEvent, routeId: any, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingPoint = { routeId: +routeId, index };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.draggingPoint) return;
      const rect = this.containerElement.nativeElement.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const path = this.pathsMap.get(this.draggingPoint.routeId);
      if (path) {
        path[this.draggingPoint.index] = { x, y };
        this.pathsMap.set(this.draggingPoint.routeId, [...path]);
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

  removePoint(event: MouseEvent, routeId: any, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    const path = this.pathsMap.get(+routeId);
    if (path) {
      path.splice(index, 1);
      this.pathsMap.set(+routeId, [...path]);
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

// Helper to inject context in standalone components
function injectContext<T>() {
  return inject(POLYMORPHEUS_CONTEXT) as T;
}
