import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  PLATFORM_ID,
  inject,
  signal,
  ViewChild,
  ElementRef,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLoader,
} from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '../services';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
  LoadedImage,
} from 'ngx-image-cropper';
import {
  GRADE_COLORS,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  GradeLabel,
  colorForGrade,
  ImageEditorResult,
  TopoRouteWithRoute,
} from '../models';
import { AvatarGradeComponent } from '../components/avatar-grade';
import { TuiScrollbar } from '@taiga-ui/core';

export interface ImageEditorConfig {
  file?: File;
  imageUrl?: string;
  // Allowed aspect ratios for crop presets
  aspectRatios?: {
    titleKey: string;
    descriptionKey: string;
    ratio: number;
  }[];
  // If true, forces the first aspect ratio and might restrict UI
  forceAspectRatio?: boolean;
  // If false, allow free resizing by default
  maintainAspectRatio?: boolean;
  // If true, shows the 'Free' option in the UI
  allowFree?: boolean;
  // If provided, the output image will be resized to this width
  resizeToWidth?: number;
  // Topo drawing specific
  allowDrawing?: boolean;
  topoRoutes?: TopoRouteWithRoute[];
  initialMode?: 'transform' | 'draw';
}

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TuiIcon,
    TuiButton,
    TuiLoader,
    ImageCropperComponent,
    TranslatePipe,
    AvatarGradeComponent,
    TuiScrollbar,
    TuiSegmented,
  ],
  template: `
    <div
      class="flex flex-col h-full overflow-hidden bg-[var(--tui-background-base)] text-[var(--tui-text-primary)]"
    >
      <!-- Top Header -->
      <div
        class="flex items-center justify-between p-4 shrink-0 border-b relative z-50 border-[var(--tui-border-normal)] bg-[var(--tui-background-base)]"
      >
        <div class="flex items-center gap-4">
          <button
            tuiIconButton
            appearance="flat"
            size="s"
            (click)="close()"
            type="button"
          >
            <tui-icon icon="@tui.x" />
          </button>

          @if (allowDrawing) {
            <tui-segmented [(activeItemIndex)]="modeIndex">
              <button type="button">
                {{ 'imageEditor.adjust' | translate }}
              </button>
              <button type="button">
                {{ 'imageEditor.annotate' | translate }}
              </button>
            </tui-segmented>
          }
        </div>

        <button
          tuiButton
          appearance="primary"
          size="m"
          [disabled]="loading()"
          (click)="save()"
        >
          {{ 'imageEditor.save' | translate }}
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Main Area -->
        <div
          class="relative flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8 bg-[var(--tui-background-neutral-1)]"
        >
          <!-- CROPPER MODE -->
          <div
            class="w-full h-full flex items-center justify-center"
            [class.hidden]="mode() !== 'transform'"
          >
            <image-cropper
              class="max-h-full max-w-full"
              [imageChangedEvent]="imageChangedEvent"
              [imageFile]="imageFile"
              [imageBase64]="imageBase64()"
              [maintainAspectRatio]="maintainAspectRatio"
              [aspectRatio]="aspectRatio"
              [resizeToWidth]="resizeToWidth"
              [cropperMinWidth]="128"
              [roundCropper]="false"
              [canvasRotation]="canvasRotation"
              [transform]="transform"
              [alignImage]="'center'"
              [imageQuality]="92"
              format="webp"
              (imageCropped)="imageCropped($event)"
              (imageLoaded)="imageLoadedCallback($event)"
              (cropperReady)="cropperReady()"
              (loadImageFailed)="loadImageFailed()"
            ></image-cropper>
          </div>

          <!-- DRAWING MODE -->
          @if (mode() === 'draw') {
            <div
              #drawContainer
              class="relative inline-block shadow-2xl rounded-lg overflow-hidden select-none"
              (mousedown)="onImageClick($event)"
              (contextmenu)="$event.preventDefault()"
            >
              <img
                #drawImage
                [src]="croppedImage"
                class="max-w-full max-h-[70dvh] block pointer-events-none"
                (load)="onDrawImageLoad()"
                alt="Source for annotation"
              />

              <!-- SVG Overlay -->
              <svg
                class="absolute inset-0 w-full h-full cursor-crosshair"
                [attr.viewBox]="viewBox()"
              >
                @for (tr of topoRoutes; track tr.route_id) {
                  @let entry = pathsMap.get(tr.route_id);
                  @if (entry) {
                    @let isSelected = selectedRoute()?.route_id === tr.route_id;
                    @let rColor = getRouteColor(tr.route_id);
                    <polyline
                      [attr.points]="getPointsString(entry.points)"
                      fill="none"
                      [attr.stroke]="
                        isSelected
                          ? selectedColor() || entry.color || rColor
                          : 'white'
                      "
                      [attr.stroke-width]="isSelected ? 4 : 2"
                      [attr.stroke-dasharray]="isSelected ? 'none' : '4 4'"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      class="pointer-events-none transition-all duration-300"
                    />

                    @if (isSelected) {
                      @for (pt of entry.points; track $index) {
                        <g
                          class="cursor-move"
                          (mousedown)="
                            startDragging($event, tr.route_id, $index)
                          "
                          (touchstart)="
                            startDraggingTouch($event, tr.route_id, $index)
                          "
                          (contextmenu)="
                            removePoint($event, tr.route_id, $index)
                          "
                        >
                          <circle
                            [attr.cx]="pt.x * drawWidth()"
                            [attr.cy]="pt.y * drawHeight()"
                            r="12"
                            fill="rgba(0,0,0,0.3)"
                          />
                          <circle
                            [attr.cx]="pt.x * drawWidth()"
                            [attr.cy]="pt.y * drawHeight()"
                            r="6"
                            [attr.fill]="
                              selectedColor() || entry.color || rColor
                            "
                          />
                        </g>
                      }
                    }
                  }
                }
              </svg>
            </div>
          }

          @if (!cropperVisible() && mode() === 'transform') {
            <div
              class="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10 bg-[var(--tui-background-base-alt)]"
            >
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>

        <!-- Mobile backdrop for sidebar -->
        @if (mode() === 'draw' && sidebarOpen()) {
          <div
            class="md:hidden fixed inset-0 z-30 bg-[var(--tui-background-backdrop)]"
            (click)="sidebarOpen.set(false)"
            (keydown.escape)="sidebarOpen.set(false)"
            role="presentation"
          ></div>
        }

        <!-- Mobile FAB toggle button -->
        @if (mode() === 'draw') {
          <div class="md:hidden absolute bottom-6 left-6 z-50">
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
        }

        <!-- Sidebar (only in Drawing mode) -->
        @if (mode() === 'draw') {
          <div
            class="w-72 shrink-0 border-l flex flex-col overflow-hidden transition-all duration-300 md:relative absolute top-0 bottom-0 right-0 z-40 border-[var(--tui-border-normal)] bg-[var(--tui-background-base)]"
            [class.translate-x-full]="!sidebarOpen()"
            [class.md:translate-x-0]="true"
            [class.shadow-2xl]="sidebarOpen()"
            [class.md:shadow-none]="true"
          >
            <div class="p-4 border-b">
              <h3 class="text-xs font-bold uppercase opacity-50 tracking-wider">
                {{ 'topos.editor.lines' | translate }}
              </h3>
            </div>

            <tui-scrollbar class="flex-1">
              <div class="p-2 flex flex-col gap-1">
                @for (tr of topoRoutes; track tr.route_id) {
                  <button
                    class="flex items-center gap-2 p-3 text-left transition-all duration-200"
                    [style.background]="
                      selectedRoute()?.route_id === tr.route_id
                        ? 'var(--tui-background-neutral-1)'
                        : 'transparent'
                    "
                    [style.border-radius.px]="12"
                    (click)="selectRoute(tr)"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span
                          class="text-xs font-bold opacity-60 shrink-0"
                          style="min-width: 1.5rem"
                        >
                          {{ tr.number }}.
                        </span>
                        <span class="font-bold text-sm truncate flex-1">
                          {{ tr.route.name }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1 mt-1 ml-8">
                        <app-avatar-grade [grade]="tr.route.grade" size="xs" />
                      </div>
                    </div>
                    @if (hasPath(tr.route_id)) {
                      <tui-icon
                        icon="@tui.check"
                        class="text-green-500 text-xs shrink-0"
                      />
                    }
                  </button>
                }
              </div>
            </tui-scrollbar>

            <!-- Color Palette -->
            <div
              class="p-4 border-t border-[var(--tui-border-normal)] bg-[var(--tui-background-base)]"
            >
              <div class="flex flex-wrap gap-2 justify-center">
                @for (c of palette; track c) {
                  @let selected = selectedRoute();
                  @let isSelectedColor =
                    (selectedColor() ||
                      (selected && getRouteColor(selected.route_id))) === c;
                  <button
                    class="w-8 h-8 border-2"
                    style="border-radius: 50%"
                    [style.background]="c"
                    [style.border-color]="
                      isSelectedColor ? 'var(--tui-primary)' : 'transparent'
                    "
                    (click)="setPathColor(c)"
                    [attr.aria-label]="'imageEditor.setColor' | translate"
                  ></button>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Bottom Toolbar -->
      @if (mode() === 'transform') {
        <div
          class="p-6 shrink-0 border-t backdrop-blur-xl"
          style="background: var(--tui-background-base-alt); border-color: var(--tui-border-normal)"
        >
          <div class="max-w-4xl mx-auto flex flex-col gap-6">
            @if (!forceAspectRatio) {
              <div
                class="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none"
              >
                @for (ratio of availableRatios; track ratio.ratio) {
                  <button
                    tuiButton
                    size="s"
                    [appearance]="
                      maintainAspectRatio && aspectRatio === ratio.ratio
                        ? 'primary'
                        : 'flat'
                    "
                    (click)="setAspectRatio(ratio.ratio)"
                  >
                    {{ ratio.titleKey }}
                  </button>
                }
                @if (!forceAspectRatio && allowFree) {
                  <button
                    tuiButton
                    size="s"
                    [appearance]="!maintainAspectRatio ? 'primary' : 'flat'"
                    (click)="toggleMaintainAspectRatio()"
                  >
                    {{ 'imageEditor.free' | translate }}
                  </button>
                }
              </div>
            }

            <!-- General Controls -->
            <div
              class="flex flex-wrap items-center justify-center gap-3 md:gap-6"
            >
              <div
                class="flex items-center gap-1 p-1 rounded-2xl"
                style="background: var(--tui-background-neutral-1)"
              >
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="rotateLeft()"
                  [title]="'imageEditor.rotate' | translate"
                >
                  <tui-icon icon="@tui.rotate-ccw" />
                </button>
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="rotateRight()"
                  [title]="'imageEditor.rotate' | translate"
                >
                  <tui-icon icon="@tui.rotate-cw" />
                </button>
              </div>

              <div
                class="flex items-center gap-1 p-1 rounded-2xl"
                style="background: var(--tui-background-neutral-1)"
              >
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="flipHorizontal()"
                  [title]="'imageEditor.flipX' | translate"
                >
                  <tui-icon icon="@tui.flip-horizontal" />
                </button>
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="flipVertical()"
                  [title]="'imageEditor.flipY' | translate"
                >
                  <tui-icon icon="@tui.flip-vertical" />
                </button>
              </div>

              <div
                class="flex items-center gap-1 p-1 rounded-2xl"
                style="background: var(--tui-background-neutral-1)"
              >
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="zoomOut()"
                  [title]="'imageEditor.zoomOutTitle' | translate"
                >
                  <tui-icon icon="@tui.minus" />
                </button>
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  (click)="zoomIn()"
                  [title]="'imageEditor.zoomInTitle' | translate"
                >
                  <tui-icon icon="@tui.plus" />
                </button>
              </div>

              <button
                tuiIconButton
                appearance="flat"
                size="m"
                (click)="resetImage()"
                style="background: var(--tui-background-neutral-1)"
                [title]="'imageEditor.reset' | translate"
              >
                <tui-icon icon="@tui.refresh-cw" />
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100dvw;
        height: 100dvh;
        max-height: 100dvh;
        overflow: hidden;
        z-index: 10000;
        font-family: 'Inter', 'Manrope', sans-serif;
      }

      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-none {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      ::ng-deep .ngx-ic-cropper {
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
      }

      ::ng-deep .ngx-ic-source-image {
        max-height: calc(100dvh - 300px) !important;
      }
    `,
  ],
})
export class ImageEditorDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);

  @ViewChild('drawImage') drawImageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('drawContainer') drawContainerElement!: ElementRef<HTMLDivElement>;

  imageChangedEvent: Event | null = null;
  imageFile: File | undefined;
  imageBase64 = signal<string | undefined>(undefined);
  croppedImage: SafeUrl = '';
  cropperVisible = signal(false);
  loading = signal(false);

  // New Drawing Mode state
  mode = signal<'transform' | 'draw'>('transform');

  get modeIndex(): number {
    return this.mode() === 'transform' ? 0 : 1;
  }

  set modeIndex(index: number) {
    this.mode.set(index === 0 ? 'transform' : 'draw');
  }

  allowDrawing = false;
  topoRoutes: ImageEditorConfig['topoRoutes'] = [];
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  selectedColor = signal<string | null>(null);
  pathsMap = new Map<
    number,
    { points: { x: number; y: number }[]; color?: string }
  >();
  palette = GRADE_COLORS;

  drawWidth = signal(0);
  drawHeight = signal(0);
  viewBox = computed(() => `0 0 ${this.drawWidth()} ${this.drawHeight()}`);
  draggingPoint: { routeId: number; index: number } | null = null;
  sidebarOpen = signal(true);

  // Cropper settings
  maintainAspectRatio = true;
  aspectRatio = 4 / 5;
  canvasRotation = 0;
  transform: ImageTransform = {
    scale: 1,
    flipH: false,
    flipV: false,
  };

  private croppedImageBlob: Blob | null | undefined = null;

  availableRatios: { titleKey: string; ratio: number }[] = [
    { titleKey: '1:1', ratio: 1 },
    { titleKey: '4:5', ratio: 4 / 5 },
    { titleKey: '16:9', ratio: 16 / 9 },
  ];

  forceAspectRatio = false;
  allowFree = true;
  resizeToWidth = 2048;

  constructor(
    @Inject(POLYMORPHEUS_CONTEXT)
    private readonly context: TuiDialogContext<
      ImageEditorResult | File | null,
      ImageEditorConfig
    >,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const data = this.context.data;
    this.forceAspectRatio = !!data.forceAspectRatio;
    this.allowFree = data.allowFree !== undefined ? data.allowFree : true;
    this.resizeToWidth = data.resizeToWidth || 2048;
    this.maintainAspectRatio =
      data.maintainAspectRatio !== undefined ? data.maintainAspectRatio : true;
    this.allowDrawing = !!data.allowDrawing;
    if (data.initialMode) {
      this.mode.set(data.initialMode);
    }
    this.topoRoutes = (data.topoRoutes || []).sort(
      (a, b) => a.number - b.number,
    );

    // Initialize paths from routes
    this.topoRoutes.forEach((tr) => {
      if (tr.path) {
        this.pathsMap.set(tr.route_id, {
          points: [...tr.path.points],
          color: tr.path.color || this.getRouteColor(tr.route_id),
        });
      }
    });
    if (this.topoRoutes.length > 0) {
      this.selectedRoute.set(this.topoRoutes[0]);
    }

    if (data.aspectRatios && data.aspectRatios.length > 0) {
      this.availableRatios = data.aspectRatios.map((r) => ({
        titleKey: r.titleKey,
        ratio: r.ratio,
      }));
      this.aspectRatio = this.availableRatios[0].ratio;
    }

    if (data.file) {
      this.imageFile = data.file;
    } else if (data.imageUrl && isPlatformBrowser(this.platformId)) {
      this.loadFromUrl(data.imageUrl);
    } else {
      this.cropperVisible.set(true);
    }
  }

  private async loadFromUrl(url: string): Promise<void> {
    try {
      // Pre-set croppedImage so we can see something in drawing mode while loading
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(url);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();

      // Convert to Base64 to avoid CORS issues in the cropper component
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        this.imageBase64.set(base64);

        // If in draw mode, also set the preview image to the data URL for better quality/consistency
        if (this.mode() === 'draw') {
          this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(base64);
        }

        // Set cropperVisible to true after loading to show the editor
        this.cropperVisible.set(true);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('[ImageEditor] Error loading image from URL', error);
      // If we are in draw mode, we can still continue as we set croppedImage at the start
      if (this.mode() === 'draw' && this.croppedImage) {
        console.warn(
          '[ImageEditor] Could not load blob for cropping, only drawing will be available',
        );
      } else {
        this.toast.error('imageEditor.invalidImageError');
        this.context.completeWith(null);
      }
    }
  }

  // DRAWING METHODS
  onDrawImageLoad(): void {
    const img = this.drawImageElement.nativeElement;
    this.drawWidth.set(img.clientWidth);
    this.drawHeight.set(img.clientHeight);
  }

  selectRoute(tr: TopoRouteWithRoute): void {
    this.selectedRoute.set(tr);
    const existing = this.pathsMap.get(tr.route_id);
    if (existing?.color) {
      this.selectedColor.set(existing.color);
    } else {
      this.selectedColor.set(this.getRouteColor(tr.route_id));
    }
  }

  setPathColor(color: string): void {
    const route = this.selectedRoute();
    if (!route) return;
    this.selectedColor.set(color);
    const existing = this.pathsMap.get(route.route_id) || { points: [] };
    this.pathsMap.set(route.route_id, { ...existing, color });
  }

  getRouteColor(routeId: number): string {
    const route = this.topoRoutes?.find((r) => r.route_id === routeId);
    if (route) {
      return colorForGrade(
        VERTICAL_LIFE_TO_LABEL[
          route.route.grade as VERTICAL_LIFE_GRADES
        ] as GradeLabel,
      );
    }
    return GRADE_COLORS[0];
  }

  hasPath(routeId: number): boolean {
    const pathData = this.pathsMap.get(routeId);
    return !!pathData && pathData.points.length > 0;
  }

  getPointsString(path: { x: number; y: number }[]): string {
    return path
      .map((p) => `${p.x * this.drawWidth()},${p.y * this.drawHeight()}`)
      .join(' ');
  }

  onImageClick(event: MouseEvent): void {
    if (event.button !== 0 || this.draggingPoint) return;
    const route = this.selectedRoute();
    if (!route) return;

    const rect =
      this.drawContainerElement.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const current = this.pathsMap.get(route.route_id) || { points: [] };
    const newPoints = [...current.points, { x, y }];
    this.pathsMap.set(route.route_id, {
      ...current,
      points: newPoints,
      color: current.color || this.getRouteColor(route.route_id),
    });
  }

  startDragging(event: MouseEvent, routeId: number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingPoint = { routeId, index };

    const pathData = this.pathsMap.get(routeId);
    if (!pathData) return;

    const point = pathData.points[index];
    let rafId: number | null = null;
    let pendingUpdate = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.draggingPoint) return;
      const rect =
        this.drawContainerElement.nativeElement.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Update point directly
      point.x = x;
      point.y = y;

      // Schedule visual update using requestAnimationFrame
      if (!pendingUpdate) {
        pendingUpdate = true;
        rafId = requestAnimationFrame(() => {
          this.cdr.detectChanges();
          pendingUpdate = false;
        });
      }
    };

    const onMouseUp = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      // Trigger final change detection
      if (pathData) {
        this.pathsMap.set(routeId, { ...pathData });
        this.cdr.markForCheck();
      }
      this.draggingPoint = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  startDraggingTouch(event: TouchEvent, routeId: number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingPoint = { routeId, index };

    const pathData = this.pathsMap.get(routeId);
    if (!pathData) return;

    const point = pathData.points[index];
    let rafId: number | null = null;
    let pendingUpdate = false;

    const onTouchMove = (e: TouchEvent) => {
      if (!this.draggingPoint || e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect =
        this.drawContainerElement.nativeElement.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (touch.clientX - rect.left) / rect.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (touch.clientY - rect.top) / rect.height),
      );

      // Update point directly
      point.x = x;
      point.y = y;

      // Schedule visual update using requestAnimationFrame
      if (!pendingUpdate) {
        pendingUpdate = true;
        rafId = requestAnimationFrame(() => {
          this.cdr.detectChanges();
          pendingUpdate = false;
        });
      }
    };

    const onTouchEnd = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      // Trigger change detection only once when dragging ends
      if (pathData) {
        this.pathsMap.set(routeId, { ...pathData });
        this.cdr.markForCheck();
      }
      this.draggingPoint = null;
      window.removeEventListener(
        'touchmove',
        onTouchMove as EventListenerOrEventListenerObject,
      );
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener(
      'touchmove',
      onTouchMove as EventListenerOrEventListenerObject,
      {
        passive: false,
      },
    );
    window.addEventListener('touchend', onTouchEnd);
  }

  removePoint(event: MouseEvent, routeId: number, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    const pathData = this.pathsMap.get(routeId);
    if (pathData) {
      pathData.points.splice(index, 1);
      this.pathsMap.set(routeId, { ...pathData });
    }
  }

  // EXISTING CROPPER METHODS
  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
    this.imageFile = undefined;
    this.imageBase64.set(undefined);
    this.cropperVisible.set(false);
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.objectUrl) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(
        event.objectUrl,
      );
    }
    this.croppedImageBlob = event.blob;
  }

  imageLoadedCallback(image: LoadedImage): void {
    console.log('[ImageEditor] Image loaded', image);
  }

  cropperReady(): void {
    this.cropperVisible.set(true);
  }

  loadImageFailed(): void {
    if (
      this.mode() !== 'draw' &&
      (this.imageFile || this.imageBase64()) &&
      !this.imageChangedEvent
    ) {
      console.warn('[ImageEditor] Image loader failed');
      this.toast.error('imageEditor.invalidImageError');
      this.context.completeWith(null);
    } else {
      this.cropperVisible.set(true);
    }
  }

  close(): void {
    this.context.completeWith(null);
  }

  rotateLeft(): void {
    this.canvasRotation--;
  }

  rotateRight(): void {
    this.canvasRotation++;
  }

  flipHorizontal(): void {
    this.transform = { ...this.transform, flipH: !this.transform.flipH };
  }

  flipVertical(): void {
    this.transform = { ...this.transform, flipV: !this.transform.flipV };
  }

  zoomOut(): void {
    this.transform = {
      ...this.transform,
      scale: Math.max(0.1, (this.transform.scale ?? 1) - 0.1),
    };
  }

  zoomIn(): void {
    this.transform = {
      ...this.transform,
      scale: (this.transform.scale ?? 1) + 0.1,
    };
  }

  resetImage(): void {
    this.canvasRotation = 0;
    this.transform = { scale: 1, flipH: false, flipV: false };
    this.maintainAspectRatio = true;
    if (this.availableRatios.length > 0) {
      this.aspectRatio = this.availableRatios[0].ratio;
    }
  }

  setAspectRatio(ratio: number): void {
    this.aspectRatio = ratio;
    this.maintainAspectRatio = true;
  }

  toggleMaintainAspectRatio(): void {
    this.maintainAspectRatio = !this.maintainAspectRatio;
  }

  async save(): Promise<void> {
    if (!this.croppedImageBlob && this.pathsMap.size === 0) return;

    if (this.croppedImageBlob && this.croppedImageBlob.size > 5 * 1024 * 1024) {
      this.toast.error('profile.avatar.upload.tooLarge');
      return;
    }

    this.loading.set(true);
    try {
      let file: File | undefined;

      if (this.croppedImageBlob) {
        let fileName = 'image.webp';
        if (this.context.data.file) {
          fileName =
            this.context.data.file.name.replace(/\.[^/.]+$/, '') + '.webp';
        } else if (this.imageChangedEvent) {
          const input = this.imageChangedEvent.target as HTMLInputElement;
          if (input.files?.[0]) {
            fileName = input.files[0].name.replace(/\.[^/.]+$/, '') + '.webp';
          }
        } else if (this.context.data.imageUrl) {
          fileName =
            (this.context.data.imageUrl.split('/').pop() || 'image')
              .split('?')[0]
              .replace(/\.[^/.]+$/, '') + '.webp';
        }

        file = new File([this.croppedImageBlob], fileName, {
          type: 'image/webp',
        });
      }

      if (this.allowDrawing) {
        const paths = Array.from(this.pathsMap.entries()).map(
          ([routeId, path]) => ({
            routeId,
            path,
          }),
        );
        this.context.completeWith({ file, paths });
      } else {
        this.context.completeWith(file || null);
      }
    } catch (error) {
      console.error('[ImageEditor] Error saving image', error);
      this.toast.error('imageEditor.uploadImageError');
    } finally {
      this.loading.set(false);
    }
  }
}
