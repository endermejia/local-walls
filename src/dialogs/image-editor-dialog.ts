import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TUI_CONFIRM, TuiSegmented } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
} from 'ngx-image-cropper';
import { firstValueFrom } from 'rxjs';

import { GradeComponent } from '../components/avatar-grade';
import { TopoDrawerComponent } from '../components/topo-drawer';
import { ImageEditorResult, TopoRouteWithRoute } from '../models';
import { ToastService } from '../services/toast.service';

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
    TopoDrawerComponent,
  ],
  template: `
    <div
      class="flex flex-col h-full overflow-hidden bg-[var(--tui-background-base)] text-[var(--tui-text-primary)]"
    >
      <!-- Top Header -->
      <div class="header">
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
        <div class="main-area">
          <!-- CROPPER MODE -->
          <div
            class="cropper-container"
            [class.visible]="mode() === 'transform'"
            [class.hidden-mode]="mode() !== 'transform'"
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
          <!-- We use style.display to preserve state (paths) when switching tabs -->
          <app-topo-drawer
            [style.display]="mode() === 'draw' ? 'block' : 'none'"
            style="width: 100%; height: 100%;"
            [imageSrc]="croppedImage"
            [topoRoutes]="topoRoutes"
          />

          @if (!cropperVisible() && mode() === 'transform') {
            <div class="loader-overlay">
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>
      </div>

      <!-- Bottom Toolbar -->
      @if (mode() === 'transform') {
        <div class="toolbar">
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
              <div class="control-group">
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

              <div class="control-group">
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

              <div class="control-group">
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
                class="reset-btn"
                (click)="resetImage()"
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

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        flex-shrink: 0;
        border-bottom: 1px solid var(--tui-border-normal);
        background-color: var(--tui-background-base);
        position: relative;
        z-index: 50;
      }

      .main-area {
        position: relative;
        flex: 1;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background-color: var(--tui-background-neutral-1);
      }
      @media (min-width: 768px) {
        .main-area {
          padding: 2rem;
        }
      }

      .cropper-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 300ms;
      }
      .cropper-container.visible {
        visibility: visible;
        position: relative;
        opacity: 1;
        pointer-events: all;
      }
      .cropper-container.hidden-mode {
        visibility: hidden;
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .loader-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        z-index: 10;
        background-color: var(--tui-background-base-alt);
      }

      .toolbar {
        padding: 1.5rem;
        flex-shrink: 0;
        border-top: 1px solid var(--tui-border-normal);
        backdrop-filter: blur(24px);
        background: var(--tui-background-base-alt);
        border-color: var(--tui-border-normal);
      }

      .control-group {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem;
        border-radius: 1rem;
        background: var(--tui-background-neutral-1);
      }

      .reset-btn {
        background: var(--tui-background-neutral-1);
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
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild(TopoDrawerComponent) drawer!: TopoDrawerComponent;

  imageChangedEvent: Event | null = null;
  imageFile: File | undefined;
  imageBase64 = signal<string | undefined>(undefined);
  croppedImage: SafeUrl = '';
  cropperVisible = signal(false);
  loading = signal(false);

  // Mode state
  mode = signal<'transform' | 'draw'>('transform');

  get modeIndex(): number {
    return this.mode() === 'transform' ? 0 : 1;
  }

  set modeIndex(index: number) {
    this.mode.set(index === 0 ? 'transform' : 'draw');
  }

  allowDrawing = false;
  topoRoutes: TopoRouteWithRoute[] = [];

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

    if (!this.drawer) return;

    const pathsMap = this.drawer.pathsMap;

    // Sort topoRoutes based on pathsMap
    const routesWithX = this.topoRoutes.map((tr) => {
      const entry = pathsMap.get(tr.route_id);
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
    const pathsMap = this.drawer ? this.drawer.pathsMap : new Map();

    if (!this.croppedImageBlob && pathsMap.size === 0) return;

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
        const paths = Array.from(pathsMap.entries()).map(([routeId, path]) => ({
          routeId,
          path,
        }));
        this.context.completeWith({
          file,
          paths,
          // Use this.topoRoutes (potentially sorted)
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
