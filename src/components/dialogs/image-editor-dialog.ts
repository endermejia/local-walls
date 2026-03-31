import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  PLATFORM_ID,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
} from 'ngx-image-cropper';

import { ToastService } from '../../services/toast.service';

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
      class="flex flex-col h-full overflow-hidden bg-[var(--tui-background-base)] text-[var(--tui-text-primary)]"
    >
      <!-- Top Toolbar (All Options) -->
      <div
        class="px-3 py-2 border-b border-[var(--tui-border-normal)] bg-[var(--tui-background-base)] shrink-0 z-50"
      >
        <div
          class="flex flex-wrap items-center justify-center gap-3 sm:gap-6 overflow-x-auto scrollbar-none"
        >
          <!-- Aspect Ratios -->
          @if (!forceAspectRatio) {
            <div
              class="flex items-center gap-1 p-1 rounded-xl bg-[var(--tui-background-neutral-1)]"
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
                  class="!rounded-lg"
                >
                  {{ ratio.titleKey }}
                </button>
              }
              @if (allowFree) {
                <button
                  tuiButton
                  size="s"
                  [appearance]="!maintainAspectRatio ? 'primary' : 'flat'"
                  (click)="toggleMaintainAspectRatio()"
                  class="!rounded-lg"
                >
                  {{ 'free' | translate }}
                </button>
              }
            </div>
          }

          <!-- Image Operations -->
          <div class="flex items-center gap-3">
            <!-- Rotate -->
            <div
              class="flex items-center gap-1 p-1 rounded-xl bg-[var(--tui-background-neutral-1)]"
            >
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="rotateLeft()"
                class="!rounded-lg"
                [title]="'rotate' | translate"
              >
                <tui-icon icon="@tui.rotate-ccw" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="rotateRight()"
                class="!rounded-lg"
                [title]="'rotate' | translate"
              >
                <tui-icon icon="@tui.rotate-cw" />
              </button>
            </div>

            <!-- Flip -->
            <div
              class="flex items-center gap-1 p-1 rounded-xl bg-[var(--tui-background-neutral-1)]"
            >
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="flipHorizontal()"
                class="!rounded-lg"
                [title]="'flipX' | translate"
              >
                <tui-icon icon="@tui.flip-horizontal" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="flipVertical()"
                class="!rounded-lg"
                [title]="'flipY' | translate"
              >
                <tui-icon icon="@tui.flip-vertical" />
              </button>
            </div>

            <!-- Zoom -->
            <div
              class="flex items-center gap-1 p-1 rounded-xl bg-[var(--tui-background-neutral-1)]"
            >
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="zoomOut()"
                class="!rounded-lg"
                [title]="'zoomOut' | translate"
              >
                <tui-icon icon="@tui.minus" />
              </button>
              <button
                tuiIconButton
                appearance="flat"
                size="s"
                (click)="zoomIn()"
                class="!rounded-lg"
                [title]="'zoomIn' | translate"
              >
                <tui-icon icon="@tui.plus" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Cropper Area (Middle) -->
      <div
        class="flex-1 overflow-hidden relative bg-[var(--tui-background-neutral-1)] flex items-center justify-center p-2"
      >
        <div
          class="flex items-center justify-center transition-opacity duration-300"
          [class.opacity-0]="!cropperVisible()"
        >
          <image-cropper
            class="max-w-full max-h-full"
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

        @if (!cropperVisible()) {
          <div
            class="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10 bg-[var(--tui-background-base-alt)]/50"
          >
            <tui-loader size="xl"></tui-loader>
          </div>
        }
      </div>

      <!-- Bottom Actions (Footer) -->
      <div
        class="shrink-0 border-t bg-[var(--tui-background-base)] z-20 flex flex-col"
        style="border-color: var(--tui-border-normal)"
      >
        <div class="px-4 py-2 flex justify-between items-center">
          <button
            tuiButton
            appearance="secondary"
            size="m"
            (click)="close()"
            type="button"
            class="!rounded-xl"
          >
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary"
            size="m"
            [disabled]="
              loading() || (!croppedImageBlob && !imageFile && !imageBase64())
            "
            (click)="save()"
            class="!rounded-xl !px-8"
          >
            {{ 'save' | translate }}
          </button>
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
        max-height: calc(100dvh - 140px) !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  imageChangedEvent: Event | null = null;
  imageFile: File | undefined;
  imageBase64 = signal<string | undefined>(undefined);
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

  protected croppedImageBlob: Blob | null | undefined = null;

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
    private readonly context: TuiDialogContext<File | null, ImageEditorConfig>,
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
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(url);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        this.imageBase64.set(base64);
        this.cropperVisible.set(true);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(blob);
    } catch {
      this.toast.error('imageEditor.invalidImageError');
      this.context.completeWith(null);
    }
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
    if ((this.imageFile || this.imageBase64()) && !this.imageChangedEvent) {
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
    if (!this.croppedImageBlob && !this.imageFile && !this.imageBase64()) {
      return;
    }

    if (this.croppedImageBlob && this.croppedImageBlob.size > 5 * 1024 * 1024) {
      this.toast.error('profile.avatar.upload.tooLarge');
      return;
    }

    this.loading.set(true);
    try {
      let file: File | undefined = this.imageFile;

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
      } else if (!file && this.imageBase64()) {
        const base64 = this.imageBase64()!;
        const res = await fetch(base64);
        const blob = await res.blob();
        file = new File([blob], 'image.webp', { type: blob.type });
      }

      this.context.completeWith(file || null);
    } catch {
      this.toast.error('imageEditor.uploadImageError');
    } finally {
      this.loading.set(false);
    }
  }
}
