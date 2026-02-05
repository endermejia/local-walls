import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
  effect,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { Canvas, FabricImage, IText, Rect, ActiveSelection, FabricObject } from 'fabric';
import * as WebFont from 'webfontloader';

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiButton,
    TuiIcon,
    TuiSelect,
    TuiDataList,
    TuiDataListWrapper,
    TuiLoader,
  ],
  template: `
    <div class="flex flex-col h-full gap-4 relative" style="max-height: 80vh">

      <!-- CANVAS AREA -->
      <div class="relative grow min-h-0 bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
        <canvas #fabricCanvas></canvas>
        <tui-loader *ngIf="loading()" class="absolute inset-0" [overlay]="true"></tui-loader>
      </div>

      <!-- CONTROLS -->
      <div class="grid gap-4">

        <!-- ROW 1: Aspect Ratio -->
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

        <!-- ROW 2: Text Tools (Visible if text selected or always available) -->
        <div class="flex flex-wrap items-center justify-center gap-2 p-2 bg-neutral-100 rounded-lg" *ngIf="hasSelection()">
            <tui-select
                [(ngModel)]="selectedFont"
                (ngModelChange)="changeFont($event)"
                size="m"
                class="w-48"
            >
                <ng-template tuiDataList>
                   <tui-data-list>
                      <button *ngFor="let item of fonts" tuiOption [value]="item">
                          {{ item }}
                      </button>
                   </tui-data-list>
                </ng-template>
                {{ selectedFont() }}
            </tui-select>

             <button
                tuiButton
                size="m"
                appearance="negative"
                iconStart="@tui.trash"
                (click)="deleteSelected()"
             >
             </button>
        </div>

        <!-- ROW 3: Main Actions -->
        <div class="flex justify-between items-center gap-2">
            <button
               tuiButton
               size="m"
               appearance="secondary"
               iconStart="@tui.type"
               (click)="addText()"
             >
               Añadir Texto
             </button>

            <div class="flex gap-2">
                <button tuiButton appearance="secondary" (click)="cancel()">
                  Cancelar
                </button>
                <button tuiButton (click)="save()">
                  Guardar
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
        width: 100%;
        max-width: 600px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent implements OnDestroy {
  private readonly context = injectContext<TuiDialogContext<File | null, File>>();

  protected readonly file = this.context.data;
  protected readonly loading = signal(true);

  @ViewChild('fabricCanvas') fabricCanvasEl?: ElementRef<HTMLCanvasElement>;
  private canvas?: Canvas;
  private _objectUrl: string | null = null;

  // State
  protected readonly aspectRatio = signal(1);
  protected readonly hasSelection = signal(false);
  protected readonly selectedFont = signal<string>('Roboto');

  // Resources
  protected readonly fonts = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Merriweather',
    'Playfair Display',
    'Nunito',
    'Raleway',
    'Pacifico'
  ];

  // Overlay Rects for Masking
  private overlayRects: Rect[] = [];
  // The crop area definition (relative to canvas)
  private cropArea = { left: 0, top: 0, width: 0, height: 0 };

  constructor() {
    // Load Fonts
    WebFont.load({
        google: {
            families: this.fonts
        }
    });

    effect(() => {
        // Init canvas once view is ready
        setTimeout(() => {
            if (this.fabricCanvasEl && !this.canvas) {
                this.initFabric();
            }
        }, 100);
    });
  }

  ngOnDestroy(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
    this.canvas?.dispose();
  }

  private async initFabric() {
    if (!this.fabricCanvasEl) return;

    // 1. Setup Canvas Size
    // We fit into the view (max 500px, but responsive)
    const viewSize = Math.min(500, window.innerWidth - 32); // 32px padding safety

    this.canvas = new Canvas(this.fabricCanvasEl.nativeElement, {
        width: viewSize,
        height: viewSize,
        backgroundColor: '#111',
        preserveObjectStacking: true,
    });

    // 2. Load Image
    this._objectUrl = URL.createObjectURL(this.file);
    const img = await FabricImage.fromURL(this._objectUrl);

    // Scale image to cover the canvas initially
    const scale = Math.max(viewSize / img.width!, viewSize / img.height!);
    img.scale(scale);
    img.set({
        originX: 'center',
        originY: 'center',
        left: viewSize / 2,
        top: viewSize / 2,
        selectable: true,
        evented: true,
    });

    this.canvas.add(img);
    this.loading.set(false);

    // 3. Setup Events
    this.canvas.on('selection:created', (e) => this.handleSelection(e.selected[0]));
    this.canvas.on('selection:updated', (e) => this.handleSelection(e.selected[0]));
    this.canvas.on('selection:cleared', () => {
        this.hasSelection.set(false);
    });

    // 4. Create Mask
    this.createOverlayMask();
    this.updateCropArea(1); // Default 1:1
  }

  private handleSelection(obj: FabricObject) {
    if (obj instanceof IText) {
        this.hasSelection.set(true);
        this.selectedFont.set(obj.fontFamily || 'Roboto');
    } else {
        this.hasSelection.set(false);
    }
  }

  // --- MASK & CROP LOGIC ---

  private createOverlayMask() {
    // We use 4 rectangles to create a "hole"
    // Top, Bottom, Left, Right
    const commonProps = {
        fill: 'rgba(0,0,0,0.7)',
        selectable: false,
        evented: false, // Let clicks pass through to image/text
    };

    this.overlayRects = [
        new Rect({ ...commonProps }), // Top
        new Rect({ ...commonProps }), // Bottom
        new Rect({ ...commonProps }), // Left
        new Rect({ ...commonProps }), // Right
    ];

    this.canvas?.add(...this.overlayRects);
  }

  private bringMaskToFront() {
      if (!this.canvas) return;
      this.overlayRects.forEach(r => this.canvas!.bringObjectToFront(r));
  }

  setRatio(ratio: number) {
    this.aspectRatio.set(ratio);
    this.updateCropArea(ratio);
  }

  private updateCropArea(ratio: number) {
    if (!this.canvas) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Calculate crop dimensions to fit in canvas
    let w = cw;
    let h = w / ratio;

    if (h > ch) {
        h = ch;
        w = h * ratio;
    }

    // Center it
    const left = (cw - w) / 2;
    const top = (ch - h) / 2;

    this.cropArea = { left, top, width: w, height: h };

    // Update Overlay Rects
    // Top
    this.overlayRects[0].set({ left: 0, top: 0, width: cw, height: top });
    // Bottom
    this.overlayRects[1].set({ left: 0, top: top + h, width: cw, height: ch - (top + h) });
    // Left
    this.overlayRects[2].set({ left: 0, top: top, width: left, height: h });
    // Right
    this.overlayRects[3].set({ left: left + w, top: top, width: cw - (left + w), height: h });

    this.canvas.requestRenderAll();
    this.bringMaskToFront();
  }

  // --- TEXT LOGIC ---

  addText() {
    if (!this.canvas) return;

    // Responsive font size: e.g. 10% of canvas width
    const fontSize = this.canvas.width * 0.08;

    const text = new IText('Texto', {
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: this.selectedFont(),
        fontSize: fontSize,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 0,
        fontWeight: 'bold',
        cornerColor: 'white',
        cornerStrokeColor: 'black',
        transparentCorners: false,
    });

    this.canvas.add(text);
    this.canvas.setActiveObject(text);

    // Ensure mask is on top of the text (so text outside crop area is dimmed)
    this.bringMaskToFront();
  }

  changeFont(font: string) {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (active && active instanceof IText) {
        // Load font if needed (WebFont loader usually caches, but ensure applied)
        WebFont.load({
            google: { families: [font] },
            active: () => {
                active.set('fontFamily', font);
                this.canvas?.requestRenderAll();
            }
        });
        // Optimistic set
        active.set('fontFamily', font);
        this.canvas.requestRenderAll();
    }
  }

  deleteSelected() {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (active) {
        this.canvas.remove(active);
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
        this.hasSelection.set(false);
    }
  }

  // --- SAVE ---

  save() {
    if (!this.canvas) return;
    this.loading.set(true);

    // 1. Temporarily hide mask
    this.overlayRects.forEach(r => r.visible = false);

    // 2. Export only the crop area
    const { left, top, width, height } = this.cropArea;

    // Multiplier to get ~1920px width (high quality)
    // Current width is `width` (e.g. 400). Target 1920.
    const multiplier = 1920 / width;

    const dataUrl = this.canvas.toDataURL({
        format: 'jpeg',
        quality: 0.85,
        left,
        top,
        width,
        height,
        multiplier
    });

    // Restore mask
    this.overlayRects.forEach(r => r.visible = true);
    this.loading.set(false);

    // Convert to File
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
