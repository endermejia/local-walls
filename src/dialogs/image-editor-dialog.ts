import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, inject, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLoader,
} from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '../services';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
  LoadedImage,
} from 'ngx-image-cropper';

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
  ],
  template: `
    <div
      class="flex flex-col h-full overflow-hidden"
      style="background: var(--tui-background-base); color: var(--tui-text-primary)"
    >
      <!-- Top Header -->
      <div
        class="flex items-center justify-between p-4 shrink-0 border-b"
        style="border-color: var(--tui-border-normal)"
      >
        <button
          tuiIconButton
          appearance="flat"
          size="s"
          class="!rounded-full"
          (click)="close()"
          type="button"
        >
          <tui-icon icon="@tui.x" />
        </button>

        <button
          tuiButton
          appearance="primary"
          size="m"
          class="!rounded-full !px-6"
          [disabled]="loading()"
          (click)="save()"
        >
          {{ 'imageEditor.save' | translate }}
        </button>
      </div>

      <!-- Cropper Area -->
      <div
        class="relative flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8"
        style="background: var(--tui-background-neutral-1)"
      >
        <image-cropper
          class="max-h-full max-w-full"
          [imageChangedEvent]="imageChangedEvent"
          [imageFile]="imageFile"
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

        @if (!cropperVisible()) {
          <div
            class="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10"
            style="background: var(--tui-background-base-alt)"
          >
            <tui-loader size="xl"></tui-loader>
          </div>
        }
      </div>

      <!-- Bottom Toolbar -->
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
                  class="!rounded-full !transition-all !duration-200"
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
                  class="!rounded-full !transition-all !duration-200"
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
                class="!rounded-xl"
                (click)="rotateLeft()"
                [title]="'imageEditor.rotate' | translate"
              >
                <tui-icon icon="@tui.rotate-ccw" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                class="!rounded-xl"
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
                class="!rounded-xl"
                (click)="flipHorizontal()"
                [title]="'imageEditor.flipX' | translate"
              >
                <tui-icon icon="@tui.flip-horizontal" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                class="!rounded-xl"
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
                class="!rounded-xl"
                (click)="zoomOut()"
                [title]="'imageEditor.zoomOutTitle' | translate"
              >
                <tui-icon icon="@tui.minus" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                class="!rounded-xl"
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
              class="!rounded-2xl"
              style="background: var(--tui-background-neutral-1)"
              [title]="'imageEditor.reset' | translate"
            >
              <tui-icon icon="@tui.refresh-cw" />
            </button>
          </div>
        </div>
      </div>
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

  imageChangedEvent: Event | null = null;
  imageFile: File | undefined;
  croppedImage: SafeUrl = '';
  cropperVisible = signal(false);
  loading = signal(false);

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
    private readonly context: TuiDialogContext<File | null, ImageEditorConfig>,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    const data = this.context.data;
    this.forceAspectRatio = !!data.forceAspectRatio;
    this.allowFree = data.allowFree !== undefined ? data.allowFree : true;
    this.resizeToWidth = data.resizeToWidth || 2048;
    this.maintainAspectRatio =
      data.maintainAspectRatio !== undefined ? data.maintainAspectRatio : true;

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
      // If no initial image, we wait for user to upload one via the input
      this.cropperVisible.set(true);
    }
  }

  private async loadFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'image';
      this.imageFile = new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error('[ImageEditor] Error loading image from URL', error);
      this.toast.error('imageEditor.invalidImageError');
      this.context.completeWith(null);
    }
  }

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
    // Clear imageFile when using event to avoid conflicts
    this.imageFile = undefined;
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
    // Optional: use image data if needed
    console.log('[ImageEditor] Image loaded', image);
  }

  cropperReady(): void {
    this.cropperVisible.set(true);
  }

  loadImageFailed(): void {
    this.toast.error('imageEditor.invalidImageError');
    // If it was the initial load, close. If it was a manual upload, just stay
    if (this.imageFile && !this.imageChangedEvent) {
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
    this.transform = {
      ...this.transform,
      flipH: !this.transform.flipH,
    };
  }

  flipVertical(): void {
    this.transform = {
      ...this.transform,
      flipV: !this.transform.flipV,
    };
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
    this.transform = {
      scale: 1,
      flipH: false,
      flipV: false,
    };
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
    if (!this.croppedImageBlob) {
      return;
    }

    if (this.croppedImageBlob.size > 5 * 1024 * 1024) {
      this.toast.error('profile.avatar.upload.tooLarge');
      return;
    }

    this.loading.set(true);

    try {
      // Determine file name from initial file or default
      let fileName = 'image.webp';
      if (this.context.data.file) {
        fileName =
          this.context.data.file.name.replace(/\.[^/.]+$/, '') + '.webp';
      } else if (this.imageChangedEvent) {
        const input = this.imageChangedEvent.target as HTMLInputElement;
        if (input.files?.[0]) {
          fileName = input.files[0].name.replace(/\.[^/.]+$/, '') + '.webp';
        }
      }

      const file = new File([this.croppedImageBlob], fileName, {
        type: 'image/webp',
      });
      this.context.completeWith(file);
    } catch (error) {
      console.error('[ImageEditor] Error saving image', error);
      this.toast.error('imageEditor.uploadImageError');
    } finally {
      this.loading.set(false);
    }
  }
}
