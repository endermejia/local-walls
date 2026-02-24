import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  PLATFORM_ID,
  inject,
  signal,
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
import { TuiScrollbar } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiSegmented } from '@taiga-ui/kit';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
} from 'ngx-image-cropper';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../services/toast.service';

import { GradeComponent } from '../components/avatar-grade';

import { GRADE_COLORS, ImageEditorResult, TopoRouteWithRoute } from '../models';

import {
} from '../utils/drawing.utils';
import {
  getRouteColor,
  hasPath as hasPathUtil,
} from '../utils/topo-styles.utils';
import { TopoCanvasComponent } from '../components/topo-canvas';
import { TopoCanvasRoute } from '../models/topo-canvas.models';

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
  // Output image quality (0-100), defaults to 92
  imageQuality?: number;
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
    GradeComponent,
    TuiScrollbar,
    TuiSegmented,
    TopoCanvasComponent,
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

        <div class="flex items-center gap-2">
          @if (mode() === 'draw') {
            <button
              tuiButton
              appearance="flat"
              size="m"
              [disabled]="loading()"
              (click)="sortByPosition()"
            >
              <tui-icon icon="@tui.list-ordered" class="mr-2" />
              {{ 'topos.editor.sort' | translate }}
            </button>
          }
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
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Main Area -->
        <div
          class="relative flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8 bg-[var(--tui-background-neutral-1)]"
        >
          <!-- CROPPER MODE -->
          <div
            class="w-full h-full flex items-center justify-center transition-opacity duration-300"
            [style.visibility]="mode() === 'transform' ? 'visible' : 'hidden'"
            [style.position]="mode() === 'transform' ? 'relative' : 'absolute'"
            [style.opacity]="mode() === 'transform' ? '1' : '0'"
            [style.pointer-events]="mode() === 'transform' ? 'all' : 'none'"
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
              [imageQuality]="imageQuality"
              format="webp"
              (imageCropped)="imageCropped($event)"
              (cropperReady)="cropperReady()"
              (loadImageFailed)="loadImageFailed()"
            ></image-cropper>
          </div>

          <!-- DRAWING MODE -->
          @if (mode() === 'draw') {
            <div
              class="flex-1 relative overflow-hidden flex items-center justify-center p-2"
            >
              <app-topo-canvas
                [imageUrl]="croppedImage"
                [routes]="canvasRoutes()"
                [selectedRouteId]="selectedRoute()?.route_id || null"
                [editable]="true"
                viewMode="editor"
                (routeClick)="selectRouteById($event.id)"
                (pathChange)="onPathChange()"
              />
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
            class="w-72 shrink-0 border-l flex flex-col overflow-hidden transition-all duration-300 md:relative absolute top-0 bottom-0 right-0 z-100 border-[var(--tui-border-normal)] bg-[var(--tui-background-base)]"
            [class.translate-x-full]="!sidebarOpen()"
            [class.md:translate-x-0]="true"
            [class.shadow-2xl]="sidebarOpen()"
            [class.md:shadow-none]="true"
          >
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

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
  topoRoutes: TopoRouteWithRoute[] = [];
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  selectedColor = signal<string | null>(null);
  pathsMap = new Map<
    number,
    { points: { x: number; y: number }[]; color?: string; _ref: TopoRouteWithRoute }
  >();
  palette = GRADE_COLORS;

  sidebarOpen = signal(true);

  protected readonly canvasRoutes = computed<TopoCanvasRoute[]>(() => {
    // We want to return ALL routes so they are selectable, even if they have no points
    return Array.from(this.pathsMap.values()).map((entry) => ({
      id: entry._ref.route_id,
      points: entry.points,
      color: entry.color || entry._ref.path?.color || '',
      grade: entry._ref.route.grade.toString(),
      name: entry._ref.route.name,
    }));
  });

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
  imageQuality = 92;

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
    this.imageQuality = data.imageQuality || 92;
    this.maintainAspectRatio =
      data.maintainAspectRatio !== undefined ? data.maintainAspectRatio : true;
    this.allowDrawing = !!data.allowDrawing;
    if (data.initialMode) {
      this.mode.set(data.initialMode);
    }
    this.topoRoutes = (data.topoRoutes || []).sort(
      (a, b) => a.number - b.number,
    );

    // Initialize paths from routes - ALL routes
    this.topoRoutes.forEach((tr) => {
      this.pathsMap.set(tr.route_id, {
        points: tr.path ? [...tr.path.points] : [],
        color: tr.path?.color || this.resolveRouteColor(tr.route_id),
        _ref: tr,
      });
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
    } catch {
      // If we are in draw mode, we can still continue as we set croppedImage at the start
      if (this.mode() === 'draw' && this.croppedImage) {
        // Continue quietly
      } else {
        this.toast.error('imageEditor.invalidImageError');
        this.context.completeWith(null);
      }
    }
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

    // Sort topoRoutes based on pathsMap
    const routesWithX = this.topoRoutes.map((tr) => {
      const entry = this.pathsMap.get(tr.route_id);
      const minX =
        entry && entry.points.length > 0
          ? Math.min(...entry.points.map((p) => p.x))
          : 999;
      return { tr, minX };
    });

    routesWithX.sort((a, b) => a.minX - b.minX);

    this.topoRoutes = routesWithX.map((item) => item.tr);
    // Update their number property for display
    this.topoRoutes.forEach((tr, i) => (tr.number = i + 1));

    this.cdr.markForCheck();
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

  selectRouteById(id: number): void {
    const tr = this.topoRoutes.find(r => r.route_id === id);
    if (tr) this.selectRoute(tr);
  }

  resolveRouteColor(routeId: number): string {
    const route = this.topoRoutes?.find((r) => r.route_id === routeId);
    if (route) {
      return getRouteColor(undefined, route.route.grade);
    }
    return GRADE_COLORS[5];
  }

  hasPath(routeId: number): boolean {
    const entry = this.pathsMap.get(routeId);
    return !!entry && entry.points.length > 0;
  }

  onPathChange(): void {
    this.cdr.markForCheck();
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
        const entry = this.pathsMap.get(route.route_id);
        if (entry) {
            entry.points = [];
            this.pathsMap.set(route.route_id, entry);
        }
        this.cdr.markForCheck();
      }
    });
  }

  imageCropped(event: ImageCroppedEvent): void {
    if (event.objectUrl) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(
        event.objectUrl,
      );
    }
    this.croppedImageBlob = event.blob;
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
        this.context.completeWith({
          file,
          paths,
          routeIds: this.topoRoutes.map((tr) => tr.route_id),
        });
      } else {
        this.context.completeWith(file || null);
      }
    } catch {
      this.toast.error('imageEditor.uploadImageError');
    } finally {
      this.loading.set(false);
    }
  }
}
