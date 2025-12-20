import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  effect,
  inject,
  input,
  computed,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TuiButton, TuiTextfieldComponent } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiSliderComponent } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';

export interface AvatarCropperResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
}

@Component({
  selector: 'app-avatar-cropper',
  standalone: true,
  imports: [
    TuiButton,
    TuiSliderComponent,
    TranslatePipe,
    TuiTextfieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full max-w-full grid gap-4">
      <div
        class="relative mx-auto"
        [style.width.px]="canvasSize"
        [style.height.px]="canvasSize"
      >
        <canvas
          #canvas
          class="rounded-lg shadow border border-black/5 bg-black/5 touch-none select-none"
          [attr.width]="canvasSize"
          [attr.height]="canvasSize"
          (pointerdown.zoneless)="onPointerDown($event)"
          (pointermove.zoneless)="onPointerMove($event)"
          (pointerup.zoneless)="onPointerUp()"
          (pointercancel.zoneless)="onPointerUp()"
          (wheel.zoneless)="onWheel($event)"
        ></canvas>
        <!-- Optional overlay frame -->
        <div
          class="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-white/80"
        ></div>
      </div>

      <tui-textfield>
        <label for="zoomInput">Zoom</label>
        <input
          id="zoomInput"
          tuiSlider
          type="range"
          [min]="minZoom()"
          [max]="maxZoom"
          [step]="0.01"
          [value]="zoom()"
          (input.zoneless)="onSliderInput($event)"
        />
      </tui-textfield>

      <br />

      <div class="flex gap-2 justify-end">
        <button tuiButton appearance="secondary" size="m" (click)="cancel()">
          {{ 'actions.cancel' | translate }}
        </button>
        <button tuiButton appearance="primary" size="m" (click)="confirm()">
          {{ 'actions.save' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class AvatarCropperComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _dialogCtx: TuiDialogContext<
    AvatarCropperResult | null,
    { file: File; size?: number }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          AvatarCropperResult | null,
          { file: File; size?: number }
        >
      >();
    } catch {
      return null;
    }
  })();

  // Inputs provided via dialog context (preferred) or as component inputs
  srcFile = input<File>(this._dialogCtx?.data?.file as File);
  targetSize = input<number>(this._dialogCtx?.data?.size ?? 512); // square output size
  maxZoom = 2;

  // Canvas ref obtained via querySelector at first render
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  readonly canvasSize = 320; // visible square viewport

  // Image and transform state
  readonly image = signal<HTMLImageElement | null>(null);
  readonly zoom = signal(1);
  private offsetX = 0;
  private offsetY = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor() {
    // Initialize after the first render
    effect(() => {
      // Guard SSR
      if (!isPlatformBrowser(this.platformId)) return;
      // lazy init canvas
      queueMicrotask(() => this.initCanvasAndImage());
    });
    // Redraw on zoom changes
    effect(() => {
      void this.redraw();
    });
  }

  private async initCanvasAndImage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this._canvas) return; // already initialized
    this._canvas = document.querySelector('app-avatar-cropper canvas');
    if (!this._canvas) return;
    this._ctx = this._canvas.getContext('2d');
    const file = this.srcFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Avoid tainting canvas by using same-origin blob URLs
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    this.image.set(img);
    // Compute initial scale to cover square
    const scaleX = this.canvasSize / img.width;
    const scaleY = this.canvasSize / img.height;
    const initialScale = Math.max(scaleX, scaleY);
    this.zoom.set(initialScale);
    // Center
    this.offsetX = (this.canvasSize - img.width * initialScale) / 2;
    this.offsetY = (this.canvasSize - img.height * initialScale) / 2;
    await this.redraw();
    // Release blob url when tab closes later; keep for now while editing
  }

  setZoom(v: number) {
    if (!Number.isFinite(v)) return;
    // enforce min to cover viewport
    const img = this.image();
    if (!img) return;
    const clamped = Math.max(this.minZoom(), Math.min(this.maxZoom, v));
    const prev = this.zoom();
    if (Math.abs(prev - clamped) < 1e-6) return;
    // Zoom around center of viewport
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    const sx = (cx - this.offsetX) / prev;
    const sy = (cy - this.offsetY) / prev;
    this.offsetX = cx - sx * clamped;
    this.offsetY = cy - sy * clamped;
    this.zoom.set(clamped);
    void this.redraw();
  }

  onWheel(event: Event) {
    const e = event as WheelEvent;
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const step = 0.1;
    this.setZoom(this.zoom() * (delta > 0 ? 1 - step : 1 + step));
  }

  // Slider helpers
  readonly minZoom = computed(() => {
    const img = this.image();
    if (!img) return 1;
    return Math.max(this.canvasSize / img.width, this.canvasSize / img.height);
  });

  onSliderInput(event: Event) {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;
    const v = Number(el.value);
    if (!Number.isFinite(v)) return;
    this.setZoom(v);
  }

  onPointerDown(event: Event) {
    const e = event as PointerEvent;
    if (!this._canvas) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }
  onPointerMove(event: Event) {
    const e = event as PointerEvent;
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.offsetX += dx;
    this.offsetY += dy;
    void this.redraw();
  }
  onPointerUp() {
    this.dragging = false;
  }

  private clampOffsets() {
    const img = this.image();
    const z = this.zoom();
    if (!img) return;
    const w = img.width * z;
    const h = img.height * z;
    // Ensure the image fully covers the square
    const minX = Math.min(0, this.canvasSize - w);
    this.offsetX = Math.min(Math.max(this.offsetX, minX), 0);
    const minY = Math.min(0, this.canvasSize - h);
    this.offsetY = Math.min(Math.max(this.offsetY, minY), 0);
  }

  private async redraw() {
    const ctx = this._ctx;
    const img = this.image();
    const z = this.zoom();
    const canvas = this._canvas;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!img) return;
    this.clampOffsets();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      Math.round(this.offsetX),
      Math.round(this.offsetY),
      Math.round(img.width * z),
      Math.round(img.height * z),
    );
  }

  async confirm() {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = document.createElement('canvas');
    const size = this.targetSize();
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const srcCanvas = this._canvas;
    if (!ctx || !srcCanvas) return;
    // Draw from viewport canvas to final size
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      srcCanvas,
      0,
      0,
      srcCanvas.width,
      srcCanvas.height,
      0,
      0,
      size,
      size,
    );
    const mime = this.srcFile()?.type || 'image/jpeg';
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), mime, 0.92),
    );
    const detail: AvatarCropperResult = {
      blob,
      fileName: this.srcFile()?.name ?? 'avatar.jpg',
      mimeType: mime,
    };
    if (this._dialogCtx) {
      this._dialogCtx.completeWith(detail);
    }
  }

  cancel() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    }
  }
}
