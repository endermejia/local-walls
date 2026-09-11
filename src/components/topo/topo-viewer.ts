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
  signal,
  viewChild,
} from '@angular/core';

import { TuiButton } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import type { TopoRouteWithRoute } from '../../models';

import { IconSrcPipe } from '../../pipes';

import { ZoomPanController } from '../../utils/zoom-pan.controller';

import { IS_BROWSER } from '../../app/is-browser';

import { GradeComponent } from '../ui/avatar-grade';

import {
  RenderedRoute,
  TopoRouteRendererComponent,
} from './topo-route-renderer';

@Component({
  selector: 'app-topo-viewer',
  standalone: true,
  imports: [
    GradeComponent,
    IconSrcPipe,
    TopoRouteRendererComponent,
    TranslatePipe,
    TuiButton,
  ],
  template: `
    <!-- Normal view -->
    <div
      class="relative w-full h-full bg-(--tui-background-neutral-1) md:rounded-xl md:border md:border-(--tui-border-normal) overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      #scrollContainer
      (wheel.zoneless)="zoomPan.onWheel($event)"
      (touchstart.zoneless)="zoomPan.onTouchStart($event)"
      (touchmove.zoneless)="zoomPan.onTouchMove($event)"
      (touchend.zoneless)="zoomPan.onTouchEnd()"
      (mousedown.zoneless)="zoomPan.onMouseDown($event)"
      (mousemove.zoneless)="zoomPan.onMouseMove($event)"
      (mouseup.zoneless)="zoomPan.onMouseUp()"
      (mouseleave.zoneless)="zoomPan.onMouseUp()"
      (dblclick.zoneless)="onImageDblClick()"
    >
      <div class="h-full w-full flex items-center justify-center min-w-full">
        <div
          #zoomContainerNormal
          class="relative h-full transition-transform duration-75 ease-out zoom-container origin-top-left"
          [class.duration-0!]="zoomPan.dragState.isDragging"
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
            loading="lazy"
            decoding="async"
            tabindex="0"
            (keydown.enter)="toggleFullscreen(!!topoImage())"
            (load)="onImageLoad($event)"
          />
          <app-topo-route-renderer
            [renderedRoutes]="renderedRoutes()"
            [imageRatio]="imageRatio()"
            [selectedRouteId]="selectedRouteId()"
            [hoveredRouteId]="hoveredRouteId()"
            [hasAccess]="hasAccess()"
            [isGlowActive]="false"
            (pathClick)="onPathClick($event.event, $event.route)"
            (hoverRoute)="onHoverRoute($event)"
            (unhoverRoute)="onUnhoverRoute()"
          />
        </div>
      </div>
    </div>

    <!-- Fullscreen overlay -->
    @if (isFullscreen()) {
      <div
        #fullscreenContainer
        class="fixed inset-0 z-1000 flex items-center justify-center overflow-hidden touch-none bg-black/80 backdrop-blur-xl cursor-grab active:cursor-grabbing"
        tabindex="0"
        (keydown.enter)="toggleFullscreen(false)"
        (click)="toggleFullscreen(false)"
        (wheel.zoneless)="zoomPan.onWheel($event)"
        (touchstart.zoneless)="zoomPan.onTouchStart($event)"
        (touchmove.zoneless)="zoomPan.onTouchMove($event)"
        (touchend.zoneless)="zoomPan.onTouchEnd()"
        (mousedown.zoneless)="zoomPan.onMouseDown($event)"
        (mousemove.zoneless)="zoomPan.onMouseMove($event)"
        (mouseup.zoneless)="zoomPan.onMouseUp()"
        (mouseleave.zoneless)="zoomPan.onMouseUp()"
        (window:keydown.arrowLeft)="selectPrevRoute()"
        (window:keydown.arrowRight)="selectNextRoute()"
        (window:keydown.escape)="toggleFullscreen(false)"
      >
        <div class="absolute top-4 right-4 z-1001">
          <button
            tuiIconButton
            type="button"
            appearance="floating"
            iconStart="@tui.x"
            size="s"
            class="rounded-full!"
            (click)="toggleFullscreen(false); $event.stopPropagation()"
          >
            {{ 'close' | translate }}
          </button>
        </div>

        <div
          #fullscreenZoomContainer
          class="relative transition-transform duration-75 ease-out zoom-container origin-top-left"
          [class.duration-0!]="zoomPan.dragState.isDragging"
          (click)="onImageClick(); $event.stopPropagation()"
          (dblclick)="onImageDblClick(); $event.stopPropagation()"
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
            loading="lazy"
            decoding="async"
            (load)="onImageLoad($event)"
          />
          <app-topo-route-renderer
            [renderedRoutes]="renderedRoutes()"
            [imageRatio]="imageRatio()"
            [selectedRouteId]="selectedRouteId()"
            [hoveredRouteId]="hoveredRouteId()"
            [hasAccess]="hasAccess()"
            [isGlowActive]="true"
            (pathClick)="onPathClick($event.event, $event.route)"
            (hoverRoute)="onHoverRoute($event)"
            (unhoverRoute)="onUnhoverRoute()"
          />
        </div>

        @if (hasAccess() && selectedRouteInfo(); as sel) {
          <div
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-(--tui-background-base) border border-(--tui-border-normal) rounded-2xl shadow-2xl p-4 w-[90vw] md:w-auto md:min-w-80 max-w-[95vw] z-10"
            (click)="$event.stopPropagation()"
            (dblclick)="$event.stopPropagation()"
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
  private readonly isBrowser = inject(IS_BROWSER);

  readonly topoImage = input<string | null | undefined>(null);
  readonly topoName = input<string>('');
  readonly renderedRoutes = input<RenderedRoute[]>([]);
  readonly hasAccess = input(false);
  readonly selectedRouteId = input<string | number | null>(null);
  readonly hoveredRouteId = input<string | number | null>(null);

  readonly selectedRouteIdChange = output<string | number | null>();
  readonly hoveredRouteIdChange = output<string | number | null>();
  readonly imageRatioChange = output<number>();

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
  private lastImageClickTime = 0;

  protected readonly zoomScale = linkedSignal({
    source: () => ({ fs: this.isFullscreen() }),
    computation: () => 1,
  });

  protected readonly zoomPosition = linkedSignal({
    source: () => ({ fs: this.isFullscreen() }),
    computation: () => ({ x: 0, y: 0 }),
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

  protected readonly zoomPan = new ZoomPanController(
    this.zoomScale,
    this.zoomPosition,
    () => this.getViewerElements(),
    () => this.minScale(),
  );

  protected readonly selectedRouteInfo = computed(() => {
    const id = this.selectedRouteId();
    if (!id) return null;
    return this.renderedRoutes().find((r) => r.route_id === id) || null;
  });

  constructor() {
    effect(() => {
      const routeId = this.selectedRouteId();
      if (routeId && this.imageRatio() > 0) {
        queueMicrotask(() => this.centerOnRoute());
      }
    });
  }

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
    if (this.zoomPan.wasRecentlyDragging()) return;

    const now = Date.now();
    const isDoubleClick = now - this.lastImageClickTime < 350;
    this.lastImageClickTime = now;

    if (isDoubleClick) {
      this.lastImageClickTime = 0;
      this.handleBackgroundDblClick();
      return;
    }

    if (!this.selectedRouteId() && !this.isFullscreen()) {
      this.toggleFullscreen(!!this.topoImage());
    }
  }

  protected onImageDblClick(): void {
    if (this.zoomPan.wasRecentlyDragging()) return;
    this.handleBackgroundDblClick();
  }

  private handleBackgroundDblClick(): void {
    if (this.selectedRouteId() !== null) {
      this.selectedRouteIdChange.emit(null);
    }
  }

  protected toggleFullscreen(value: boolean): void {
    this.isFullscreen.set(value);
    if (!value) this.zoomPan.resetZoom();
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
    if (!els || !this.isBrowser) return;
    const { img: imgEl } = els;
    if (imgEl.naturalWidth === 0 || imgEl.offsetWidth === 0) return;
    const info = this.selectedRouteInfo();
    if (!info?.path || info.path.points.length === 0) return;
    const pts = info.path.points;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    this.zoomPan.centerOnPoint(
      { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      els,
    );
  }

  private getViewerElements() {
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
