import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GradeComponent } from '../ui/avatar-grade';
import { GradeLabelPipe } from '../../pipes';
import { IconSrcPipe } from '../../pipes';
import {
  ViewerZoomPanState,
  ViewerDragState,
  ViewerElements,
  createViewerDragState,
  handleViewerWheelZoom,
  handleViewerTouchStart,
  handleViewerTouchMove,
  handleViewerMouseDown,
  handleViewerMouseMove,
  centerViewerOnPoint,
} from '../../utils';
import type { TopoRouteWithRoute } from '../../models';

interface RenderedRoute extends TopoRouteWithRoute {
  style: { stroke: string; opacity: number; isDashed: boolean };
  width: number;
  pointsString: string;
}

@Component({
  selector: 'app-topo-viewer',
  standalone: true,
  imports: [
    GradeComponent,
    GradeLabelPipe,
    IconSrcPipe,
    TranslatePipe,
    TuiButton,
    TuiIcon,
  ],
  template: `
    <!-- Normal view -->
    <div
      class="relative w-full h-full bg-(--tui-background-neutral-1) md:rounded-xl md:border md:border-(--tui-border-normal) overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      #scrollContainer
      (wheel.zoneless)="onWheel($event)"
      (touchstart.zoneless)="onTouchStart($event)"
      (touchmove.zoneless)="onTouchMove($event)"
      (touchend.zoneless)="onTouchEnd()"
      (mousedown.zoneless)="onMouseDown($event)"
      (mousemove.zoneless)="onMouseMove($event)"
      (mouseup.zoneless)="onMouseUp()"
      (mouseleave.zoneless)="onMouseUp()"
    >
      <div class="h-full w-full flex items-center justify-center min-w-full">
        <div
          #zoomContainerNormal
          class="relative h-full transition-transform duration-75 ease-out zoom-container origin-top-left"
          [class.duration-0!]="dragState.isDragging"
          [style.transform]="
            'translate(' +
            zoomPosition().x +
            'px, ' +
            zoomPosition().y +
            'px) scale(' +
            zoomScale() +
            ')'
          "
          (click.zoneless)="onImageClick()"
        >
          <img
            #topoImgNormal
            [src]="topoImage() || ('topo' | iconSrc)"
            [alt]="topoName()"
            class="w-auto h-full max-w-none block object-cover"
            draggable="false"
            decoding="async"
            tabindex="0"
            (keydown.enter)="toggleFullscreen(!!topoImage())"
            (load)="onImageLoad($event)"
          />
          @if (topoImage() && hasAccess()) {
            @let ratio = imageRatio();
            @let hScale = 1000 / ratio;
            <svg
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.viewBox]="'0 0 1000 ' + hScale"
              preserveAspectRatio="none"
            >
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  <polyline
                    class="pointer-events-auto cursor-pointer"
                    (click)="onPathClick($event, tr); $event.stopPropagation()"
                    (mouseenter)="onHoverRoute(tr.route_id)"
                    (mouseleave)="onUnhoverRoute()"
                    [attr.points]="tr.pointsString"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="
                      (selectedRouteId() === tr.route_id ? 0.06 : 0.025) * 1000
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                }
              }
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  <polyline
                    [attr.points]="tr.pointsString"
                    fill="none"
                    stroke="white"
                    [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                    [attr.stroke-width]="
                      tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                    "
                    [attr.stroke-dasharray]="
                      tr.style.isDashed ? '10, 10' : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  <polyline
                    [attr.points]="tr.pointsString"
                    fill="none"
                    [attr.stroke]="tr.style.stroke"
                    [style.opacity]="tr.style.opacity"
                    [attr.stroke-width]="tr.width * 1000"
                    [attr.stroke-dasharray]="
                      tr.style.isDashed ? '10, 10' : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  @if (tr.path.points[tr.path.points.length - 1]; as last) {
                    <circle
                      [attr.cx]="last.x * 1000"
                      [attr.cy]="last.y * hScale"
                      [attr.r]="tr.width * 1000"
                      fill="white"
                      [style.opacity]="tr.style.opacity"
                      stroke="black"
                      [attr.stroke-width]="0.5"
                    />
                  }
                }
              }
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  @if (tr.path.points[0]; as first) {
                    <circle
                      class="pointer-events-auto cursor-pointer"
                      (click)="
                        onPathClick($event, tr); $event.stopPropagation()
                      "
                      (mouseenter)="onHoverRoute(tr.route_id)"
                      (mouseleave)="onUnhoverRoute()"
                      [attr.cx]="first.x * 1000"
                      [attr.cy]="first.y * hScale"
                      [attr.r]="tr.width * 2000"
                      [attr.fill]="tr.style.stroke"
                      stroke="white"
                      stroke-width="1"
                    />
                    <text
                      class="pointer-events-none"
                      [attr.x]="first.x * 1000"
                      [attr.y]="first.y * hScale + tr.width * 600"
                      text-anchor="middle"
                      fill="white"
                      style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                      [attr.font-size]="tr.width * 1600"
                      font-weight="bold"
                      font-family="sans-serif"
                    >
                      {{ tr.route.grade | gradeLabel }}
                    </text>
                  }
                }
              }
            </svg>
          }
        </div>
      </div>
    </div>

    <!-- Fullscreen overlay -->
    @if (isFullscreen()) {
      <div
        #fullscreenContainer
        class="fixed inset-0 z-1000 flex items-center justify-center overflow-hidden touch-none backdrop-blur-xl cursor-grab active:cursor-grabbing"
        tabindex="0"
        (keydown.enter)="toggleFullscreen(false)"
        (click)="toggleFullscreen(false)"
        (wheel.zoneless)="onWheel($event)"
        (touchstart.zoneless)="onTouchStart($event)"
        (touchmove.zoneless)="onTouchMove($event)"
        (touchend.zoneless)="onTouchEnd()"
        (mousedown.zoneless)="onMouseDown($event)"
        (mousemove.zoneless)="onMouseMove($event)"
        (mouseup.zoneless)="onMouseUp()"
        (mouseleave.zoneless)="onMouseUp()"
        (window:keydown.arrowLeft)="selectPrevRoute()"
        (window:keydown.arrowRight)="selectNextRoute()"
        (window:keydown.escape)="toggleFullscreen(false)"
      >
        <div class="absolute top-4 right-4 z-1001">
          <button
            tuiIconButton
            appearance="floating"
            size="l"
            class="bg-(--tui-background-base) rounded-full!"
            (click)="toggleFullscreen(false); $event.stopPropagation()"
          >
            <tui-icon icon="@tui.x" />
          </button>
        </div>

        <div
          #fullscreenZoomContainer
          class="relative transition-transform duration-75 ease-out zoom-container origin-top-left"
          [class.duration-0!]="dragState.isDragging"
          (click)="onImageClick(); $event.stopPropagation()"
          (keydown.enter)="$event.stopPropagation()"
          tabindex="-1"
          [style.transform]="
            'translate(' +
            zoomPosition().x +
            'px, ' +
            zoomPosition().y +
            'px) scale(' +
            zoomScale() +
            ')'
          "
        >
          <img
            #topoImgFullscreen
            [src]="topoImage() || ('topo' | iconSrc)"
            [alt]="topoName()"
            class="w-full h-auto block max-w-none"
            draggable="false"
            (load)="onImageLoad($event)"
          />
          @if (topoImage() && hasAccess()) {
            @let ratio = imageRatio();
            @let hScale = 1000 / ratio;
            <svg
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.viewBox]="'0 0 1000 ' + hScale"
              preserveAspectRatio="none"
            >
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  <polyline
                    class="pointer-events-auto cursor-pointer"
                    (click)="onPathClick($event, tr); $event.stopPropagation()"
                    (mouseenter)="onHoverRoute(tr.route_id)"
                    (mouseleave)="onUnhoverRoute()"
                    [attr.points]="tr.pointsString"
                    fill="none"
                    stroke="transparent"
                    [attr.stroke-width]="
                      (selectedRouteId() === tr.route_id ? 0.06 : 0.025) * 1000
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                }
              }
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  <polyline
                    [attr.points]="tr.pointsString"
                    fill="none"
                    stroke="white"
                    [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                    [attr.stroke-width]="
                      tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                    "
                    [attr.stroke-dasharray]="
                      tr.style.isDashed ? '10, 10' : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  <polyline
                    [attr.points]="tr.pointsString"
                    fill="none"
                    [attr.stroke]="tr.style.stroke"
                    [style.opacity]="tr.style.opacity"
                    [attr.stroke-width]="tr.width * 1000"
                    [attr.stroke-dasharray]="
                      tr.style.isDashed ? '10, 10' : 'none'
                    "
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    class="transition-all duration-300"
                  />
                  @if (tr.path.points[tr.path.points.length - 1]; as last) {
                    <circle
                      [attr.cx]="last.x * 1000"
                      [attr.cy]="last.y * hScale"
                      [attr.r]="tr.width * 1000"
                      fill="white"
                      [style.opacity]="tr.style.opacity"
                      stroke="black"
                      [attr.stroke-width]="0.5"
                    />
                  }
                }
              }
              @for (tr of renderedRoutes(); track tr.route_id) {
                @if (tr.path && tr.path.points.length > 0) {
                  <g
                    class="pointer-events-auto cursor-pointer"
                    (click)="onPathClick($event, tr); $event.stopPropagation()"
                    (mouseenter)="onHoverRoute(tr.route_id)"
                    (mouseleave)="onUnhoverRoute()"
                  >
                    @if (tr.path.points[0]; as first) {
                      <circle
                        [attr.cx]="first.x * 1000"
                        [attr.cy]="first.y * hScale"
                        [attr.r]="tr.width * 2000"
                        [attr.fill]="tr.style.stroke"
                        stroke="white"
                        stroke-width="1"
                      />
                      <text
                        [attr.x]="first.x * 1000"
                        [attr.y]="first.y * hScale + tr.width * 600"
                        text-anchor="middle"
                        fill="white"
                        style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                        [attr.font-size]="tr.width * 1600"
                        font-weight="bold"
                        font-family="sans-serif"
                      >
                        {{ tr.route.grade | gradeLabel }}
                      </text>
                    }
                  </g>
                }
              }
            </svg>
          }
        </div>

        @if (hasAccess() && selectedRouteInfo(); as sel) {
          <div
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-(--tui-background-base) border border-(--tui-border-normal) rounded-2xl shadow-2xl p-4 w-[90vw] md:w-auto md:min-w-80 max-w-[95vw] z-10"
            (click)="$event.stopPropagation()"
            (keydown.enter)="$event.stopPropagation()"
            tabindex="-1"
          >
            <div class="flex items-center gap-3">
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                iconStart="@tui.chevron-left"
                class="rounded-full!"
                [title]="'previous' | translate"
                [attr.aria-label]="'previous' | translate"
                (click)="selectPrevRoute(); $event.stopPropagation()"
              ></button>
              <div class="flex flex-1 items-center gap-3 min-w-0">
                <div class="flex-1 min-w-0">
                  <div
                    class="font-bold text-lg wrap-break-word line-clamp-2 text-center"
                  >
                    {{ sel.route.name }}
                  </div>
                  <div class="mt-2 text-center">
                    <app-grade
                      [grade]="sel.route.grade"
                      [kind]="sel.route.climbing_kind"
                      size="m"
                    />
                  </div>
                </div>
              </div>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                iconStart="@tui.chevron-right"
                class="rounded-full! mr-1"
                [title]="'next' | translate"
                [attr.aria-label]="'next' | translate"
                (click)="selectNextRoute(); $event.stopPropagation()"
              ></button>
            </div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoViewerComponent {
  private readonly platformId = inject(PLATFORM_ID);

  topoImage = input<string | null | undefined>(null);
  topoName = input<string>('');
  renderedRoutes = input<RenderedRoute[]>([]);
  hasAccess = input(false);
  selectedRouteId = input<string | number | null>(null);
  hoveredRouteId = input<string | number | null>(null);

  selectedRouteIdChange = output<string | number | null>();
  hoveredRouteIdChange = output<string | number | null>();
  imageRatioChange = output<number>();

  constructor() {
    effect(() => {
      const routeId = this.selectedRouteId();
      if (routeId && this.imageRatio() > 0) {
        queueMicrotask(() => this.centerOnRoute());
      }
    });
  }

  protected readonly scrollContainer =
    viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  protected readonly fullscreenContainer = viewChild<
    ElementRef<HTMLDivElement>
  >('fullscreenContainer');
  protected readonly topoImgNormal =
    viewChild<ElementRef<HTMLImageElement>>('topoImgNormal');
  protected readonly topoImgFullscreen =
    viewChild<ElementRef<HTMLImageElement>>('topoImgFullscreen');
  protected readonly zoomContainerNormal = viewChild<
    ElementRef<HTMLDivElement>
  >('zoomContainerNormal');
  protected readonly fullscreenZoomContainer = viewChild<
    ElementRef<HTMLDivElement>
  >('fullscreenZoomContainer');

  protected readonly isFullscreen = signal(false);
  protected readonly imageRatio = signal(1);

  protected readonly zoomScale = linkedSignal({
    source: () => ({ fs: this.isFullscreen() }),
    computation: () => 1,
  });

  protected readonly zoomPosition = linkedSignal({
    source: () => ({ fs: this.isFullscreen() }),
    computation: () => ({ x: 0, y: 0 }),
  });

  private readonly viewerState: ViewerZoomPanState = {
    zoomScale: this.zoomScale,
    zoomPosition: this.zoomPosition,
  };
  protected readonly dragState: ViewerDragState = createViewerDragState();

  protected readonly selectedRouteInfo = computed(() => {
    const id = this.selectedRouteId();
    if (!id) return null;
    return this.renderedRoutes().find((r) => r.route_id === id) || null;
  });

  protected readonly minScale = computed(() => {
    const ratio = this.imageRatio();
    const isFs = this.isFullscreen();
    const container = isFs
      ? this.fullscreenContainer()?.nativeElement
      : this.scrollContainer()?.nativeElement;
    if (!container) return 0.1;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (!w || !h) return 0.1;
    const containerRatio = w / h;
    if (isFs) return Math.min(1, ratio / containerRatio);
    return Math.max(0.1, Math.min(1, containerRatio / ratio));
  });

  protected onHoverRoute(routeId: string | number): void {
    this.hoveredRouteIdChange.emit(routeId);
  }

  protected onUnhoverRoute(): void {
    this.hoveredRouteIdChange.emit(null);
  }

  protected onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      this.imageRatio.set(ratio);
      this.imageRatioChange.emit(ratio);
    }
  }

  protected onPathClick(event: Event, route: TopoRouteWithRoute): void {
    event.stopPropagation();
    const next: string | number | null =
      this.selectedRouteId() === route.route_id ? null : route.route_id;
    this.selectedRouteIdChange.emit(next);
  }

  protected onImageClick(): void {
    if (this.dragState.hasMoved) return;
    if (this.selectedRouteId()) {
      this.selectedRouteIdChange.emit(null);
    } else if (!this.isFullscreen()) {
      this.toggleFullscreen(!!this.topoImage());
    }
  }

  protected toggleFullscreen(value: boolean): void {
    this.isFullscreen.set(value);
    if (!value) this.resetZoom();
  }

  protected resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomPosition.set({ x: 0, y: 0 });
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  protected onWheel(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerWheelZoom(event, this.viewerState, el, {
      minScale: this.minScale(),
    });
  }

  protected onTouchStart(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerTouchStart(event, this.viewerState, this.dragState, el);
  }

  protected onTouchMove(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerTouchMove(event, this.viewerState, this.dragState, el, {
      minScale: this.minScale(),
    });
  }

  protected onTouchEnd(): void {
    this.dragState.isDragging = false;
  }

  protected onMouseDown(event: Event): void {
    handleViewerMouseDown(
      event as MouseEvent,
      this.viewerState,
      this.dragState,
    );
  }

  protected onMouseMove(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerMouseMove(
      event as MouseEvent,
      this.viewerState,
      this.dragState,
      el,
    );
  }

  protected onMouseUp(): void {
    this.dragState.isDragging = false;
  }

  protected selectPrevRoute(): void {
    this.navigateDrawnRoute(-1);
  }

  protected selectNextRoute(): void {
    this.navigateDrawnRoute(1);
  }

  private navigateDrawnRoute(step: number): void {
    const currentId = this.selectedRouteId();
    if (!currentId) return;
    const drawn = this.renderedRoutes()
      .filter((tr) => tr.path && tr.path.points.length > 0)
      .sort((a, b) => a.number - b.number);
    if (drawn.length === 0) return;
    const idx = drawn.findIndex((r) => r.route_id === currentId);
    if (idx === -1) return;
    const next = (idx + step + drawn.length) % drawn.length;
    this.selectedRouteIdChange.emit(drawn[next].route_id);
  }

  private centerOnRoute(): void {
    const els = this.getViewerElements();
    if (!els || !isPlatformBrowser(this.platformId)) return;
    const { img: imgEl } = els;
    if (imgEl.naturalWidth === 0 || imgEl.offsetWidth === 0) return;
    const info = this.selectedRouteInfo();
    if (!info?.path || info.path.points.length === 0) return;
    const pts = info.path.points;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    centerViewerOnPoint(
      this.viewerState,
      { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      els,
    );
  }

  private getViewerElements(): ViewerElements | null {
    const isFs = this.isFullscreen();
    const container = isFs
      ? this.fullscreenContainer()
      : this.scrollContainer();
    const zoomContainer = isFs
      ? this.fullscreenZoomContainer()
      : this.zoomContainerNormal();
    const img = isFs ? this.topoImgFullscreen() : this.topoImgNormal();
    if (!container || !zoomContainer || !img) return null;
    return {
      container: container.nativeElement,
      zoomContainer: zoomContainer.nativeElement,
      img: img.nativeElement,
    };
  }
}
