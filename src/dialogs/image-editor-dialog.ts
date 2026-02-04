import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { Canvas, FabricImage, IText } from 'fabric';

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageCropperComponent,
    TuiButton,
  ],
  template: `
    <div class="flex flex-col h-full gap-4" style="max-height: 80vh">

      <!-- STEP 1: CROP -->
      <ng-container *ngIf="step() === 'crop'">
        <div class="relative grow min-h-0 bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <image-cropper
            [imageFile]="file"
            [maintainAspectRatio]="true"
            [aspectRatio]="aspectRatio()"
            [resizeToWidth]="1920"
            format="jpeg"
            (imageCropped)="imageCropped($event)"
            class="max-h-full w-full"
          ></image-cropper>
        </div>

        <div class="grid gap-4">
          <!-- Aspect Ratio Controls -->
          <div class="flex justify-center gap-2">
            <button
              tuiButton
              size="s"
              [appearance]="aspectRatio() === 1 ? 'primary' : 'secondary'"
              (click)="setRatio(1)"
            >
              1:1
            </button>
            <button
              tuiButton
              size="s"
              [appearance]="aspectRatio() === 0.8 ? 'primary' : 'secondary'"
              (click)="setRatio(0.8)"
            >
              4:5
            </button>
            <button
              tuiButton
              size="s"
              [appearance]="aspectRatio() === 16/9 ? 'primary' : 'secondary'"
              (click)="setRatio(16/9)"
            >
              16:9
            </button>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2">
            <button tuiButton appearance="secondary" (click)="cancel()">
              Cancelar
            </button>
            <button tuiButton (click)="goToText()">
              Siguiente
            </button>
          </div>
        </div>
      </ng-container>

      <!-- STEP 2: TEXT -->
      <ng-container *ngIf="step() === 'text'">
        <div class="relative grow min-h-0 bg-neutral-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
          <canvas #fabricCanvas></canvas>
        </div>

        <div class="grid gap-4">
           <div class="flex justify-center gap-2">
             <button
               tuiButton
               size="m"
               appearance="secondary"
               iconStart="@tui.type"
               (click)="addText()"
             >
               Añadir Texto
             </button>
             <button
                tuiButton
                size="m"
                appearance="negative"
                iconStart="@tui.trash"
                (click)="deleteSelected()"
                [disabled]="!hasSelection()"
             >
                Borrar
             </button>
           </div>

           <!-- Actions -->
           <div class="flex justify-end gap-2">
            <button tuiButton appearance="secondary" (click)="step.set('crop')">
              Atrás
            </button>
            <button tuiButton (click)="save()">
              Guardar
            </button>
           </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 600px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent {
  private readonly context = injectContext<TuiDialogContext<File | null, File>>();

  protected readonly file = this.context.data;
  protected readonly step = signal<'crop' | 'text'>('crop');

  // Crop Step
  protected readonly aspectRatio = signal(1); // Default 1:1
  private currentCroppedEvent: ImageCroppedEvent | null = null;

  // Text Step
  @ViewChild('fabricCanvas') fabricCanvasEl?: ElementRef<HTMLCanvasElement>;
  private canvas?: Canvas;
  protected readonly hasSelection = signal(false);

  constructor() {
    effect(() => {
      if (this.step() === 'text' && this.currentCroppedEvent?.objectUrl) {
        // Wait for view to init (effect runs usually after render, but setTimeout ensures element is in DOM)
        setTimeout(() => {
            this.initFabric(this.currentCroppedEvent!.objectUrl!);
        }, 50);
      }
    });
  }

  // --- CROP LOGIC ---

  setRatio(ratio: number) {
    this.aspectRatio.set(ratio);
  }

  imageCropped(event: ImageCroppedEvent) {
    this.currentCroppedEvent = event;
  }

  goToText() {
    if (this.currentCroppedEvent) {
      this.step.set('text');
    }
  }

  // --- TEXT LOGIC ---

  private async initFabric(imageUrl: string) {
    if (!this.fabricCanvasEl) return;

    // Dispose previous if any
    if (this.canvas) {
        this.canvas.dispose();
    }

    // Determine dimensions
    // We want to fit the canvas in the view (max width e.g. 500px)
    const maxWidth = 500;
    const maxHeight = 500; // soft limit

    const img = await FabricImage.fromURL(imageUrl);

    // Calculate scale to fit maxWidth
    let displayWidth = img.width || 1000;
    let displayHeight = img.height || 1000;
    const aspect = displayWidth / displayHeight;

    if (displayWidth > maxWidth) {
        displayWidth = maxWidth;
        displayHeight = displayWidth / aspect;
    }

    // Create canvas
    this.canvas = new Canvas(this.fabricCanvasEl.nativeElement, {
        width: displayWidth,
        height: displayHeight,
        selection: false, // disable group selection dragging for cleaner mobile UX? Or keep it.
    });

    // Set Background
    img.scaleToWidth(displayWidth);
    this.canvas.backgroundImage = img;
    this.canvas.renderAll();

    // Event listeners
    this.canvas.on('selection:created', () => this.hasSelection.set(true));
    this.canvas.on('selection:updated', () => this.hasSelection.set(true));
    this.canvas.on('selection:cleared', () => this.hasSelection.set(false));
  }

  addText() {
    if (!this.canvas) return;

    const text = new IText('Texto', {
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: 'sans-serif',
        fontSize: this.canvas.width / 15, // Responsive font size
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1, // Will be scaled up on export
        fontWeight: 'bold',
        cornerColor: 'white',
        cornerStrokeColor: 'black',
        transparentCorners: false,
    });

    this.canvas.add(text);
    this.canvas.setActiveObject(text);
  }

  deleteSelected() {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (active) {
        this.canvas.remove(active);
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
    }
  }

  // --- SAVE ---

  save() {
    if (this.step() === 'crop') {
        // If they click save in crop step (shouldn't happen with current template, but safety)
        this.goToText();
        // Wait? No, save happens in text step
        return;
    }

    if (!this.canvas || !this.currentCroppedEvent) {
        this.cancel();
        return;
    }

    // Export logic
    // We are working on a scaled down canvas (e.g. 500px width).
    // The original cropped image was likely 1920px (resizeToWidth=1920).
    // We need to export at the original resolution.

    const originalWidth = this.currentCroppedEvent.width;
    const canvasWidth = this.canvas.width;
    const multiplier = originalWidth / canvasWidth;

    const dataUrl = this.canvas.toDataURL({
        format: 'jpeg',
        quality: 0.85,
        multiplier: multiplier
    });

    // Convert DataURL to File
    fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const finalFile = new File([blob], this.file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });
            this.context.completeWith(finalFile);
        });
  }

  cancel() {
    this.context.completeWith(null);
  }
}
