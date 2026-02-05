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
  NgZone,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { Canvas, FabricImage, IText, Rect, FabricObject } from 'fabric';
import * as WebFont from 'webfontloader';

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TuiButton,
    TuiIcon,
    TuiSelect,
    TuiDataList,
    TuiDataListWrapper,
    TuiLoader,
  ],
  template: `
    <div class="flex flex-col h-full gap-4 relative w-full" style="max-height: 85vh">

      <!-- CANVAS AREA -->
      <div
        #canvasContainer
        class="relative grow min-h-0 bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700 w-full"
      >
        <canvas #fabricCanvas class="w-full h-full"></canvas>
        <tui-loader *ngIf="loading()" class="absolute inset-0" [overlay]="true"></tui-loader>
      </div>

      <!-- CONTROLS -->
      <div class="grid gap-4 shrink-0">

        <!-- ROW 1: Aspect Ratio -->
        <div class="flex justify-center gap-2 overflow-x-auto py-1">
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

        <!-- ROW 2: Text Tools & List -->
        <div class="grid gap-3 p-3 bg-neutral-100 rounded-lg border border-neutral-200">
            <!-- Text Actions -->
             <div class="flex flex-wrap gap-2 items-center justify-between">
                <button
                   tuiButton
                   size="s"
                   appearance="secondary"
                   iconStart="@tui.type"
                   (click)="addText()"
                 >
                   Añadir Texto
                 </button>

                <tui-select
                    *ngIf="hasSelection()"
                    [formControl]="fontControl"
                    size="s"
                    class="w-48"
                >
                    <ng-template tuiDataList>
                       <tui-data-list>
                          <button *ngFor="let item of fonts" tuiOption [value]="item">
                              {{ item }}
                          </button>
                       </tui-data-list>
                    </ng-template>
                    {{ fontControl.value }}
                </tui-select>
             </div>

             <!-- Text Layers List -->
             <div *ngIf="textLayers().length > 0" class="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                <div class="text-xs font-bold opacity-50 uppercase tracking-wider mb-1">Capas de texto</div>
                @for (text of textLayers(); track text) {
                  <div
                    class="flex items-center gap-2 p-2 rounded bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
                    [class.!border-primary]="isActive(text)"
                    (click)="selectText(text)"
                  >
                    <div class="grow text-sm truncate font-medium">
                        {{ text.text || 'Texto sin contenido' }}
                    </div>
                    <button
                        tuiIconButton
                        size="xs"
                        appearance="icon"
                        icon="@tui.trash"
                        class="opacity-50 hover:opacity-100"
                        (click)="deleteTextLayer($event, text)"
                    ></button>
                  </div>
                }
             </div>
        </div>

        <!-- ROW 3: Main Actions -->
        <div class="flex justify-end items-center gap-2 pt-2 border-t border-neutral-200">
            <button tuiButton appearance="secondary" (click)="cancel()">
              Cancelar
            </button>
            <button tuiButton (click)="save()">
              Guardar
            </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 800px; /* Increased max width for better desktop experience */
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent implements OnDestroy {
  private readonly context = injectContext<TuiDialogContext<File | null, File>>();
  private readonly ngZone = inject(NgZone);

  protected readonly file = this.context.data;
  protected readonly loading = signal(true);

  @ViewChild('fabricCanvas') fabricCanvasEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainerEl?: ElementRef<HTMLDivElement>;

  private canvas?: Canvas;
  private _objectUrl: string | null = null;
  private resizeObserver?: ResizeObserver;

  // State
  protected readonly aspectRatio = signal(1);
  protected readonly hasSelection = signal(false);
  protected readonly fontControl = new FormControl('Roboto', { nonNullable: true });

  protected readonly textLayers = signal<IText[]>([]);

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

    // Font change listener
    this.fontControl.valueChanges.subscribe(font => {
        this.changeFont(font);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
    this.canvas?.dispose();
  }

  private async initFabric() {
    if (!this.fabricCanvasEl || !this.canvasContainerEl) return;

    // 1. Setup Canvas Size based on Container
    const containerWidth = this.canvasContainerEl.nativeElement.clientWidth;
    // We want a square canvas area initially, or responsive height?
    // Let's max out height at 60vh
    const containerHeight = Math.min(containerWidth, window.innerHeight * 0.6);

    this.canvas = new Canvas(this.fabricCanvasEl.nativeElement, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: '#111',
        preserveObjectStacking: true,
    });

    // 2. Load Image
    this._objectUrl = URL.createObjectURL(this.file);
    const img = await FabricImage.fromURL(this._objectUrl);

    // Scale image to cover the canvas initially
    // We want the image to fit fully visible initially? Or cover?
    // "Cover" is usually better for cropping.
    const scale = Math.max(containerWidth / img.width!, containerHeight / img.height!);
    img.scale(scale);
    img.set({
        originX: 'center',
        originY: 'center',
        left: containerWidth / 2,
        top: containerHeight / 2,
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

    // Track text objects
    this.canvas.on('object:added', () => this.updateTextLayers());
    this.canvas.on('object:removed', () => this.updateTextLayers());
    this.canvas.on('object:modified', () => this.updateTextLayers()); // Text content change

    // 4. Create Mask
    this.createOverlayMask();
    this.updateCropArea(1); // Default 1:1

    // 5. Responsive Resize
    this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => {
            // Re-calc canvas dimensions if container changes?
            // Fabric handling resize is complex (scaling everything).
            // For this dialog, maybe we just stick to initial size or simple centered resize?
            // Let's skip complex dynamic resize for now to avoid bugs, usually dialog width is stable.
        });
    });
    this.resizeObserver.observe(this.canvasContainerEl.nativeElement);
  }

  private handleSelection(obj: FabricObject) {
    if (obj instanceof IText) {
        this.hasSelection.set(true);
        this.fontControl.setValue(obj.fontFamily || 'Roboto', { emitEvent: false });
    } else {
        this.hasSelection.set(false);
    }
    // Update list highlight
    this.updateTextLayers();
  }

  private updateTextLayers() {
    if (!this.canvas) return;
    const texts = this.canvas.getObjects().filter(o => o instanceof IText) as IText[];
    // Reverse to show newest on top? Or match visual stack (top is last).
    // Usually layers list shows Top item at Top.
    this.textLayers.set([...texts].reverse());
  }

  protected isActive(text: IText): boolean {
    return this.canvas?.getActiveObject() === text;
  }

  protected selectText(text: IText) {
    if (!this.canvas) return;
    this.canvas.setActiveObject(text);
    this.canvas.requestRenderAll();
  }

  protected deleteTextLayer(event: Event, text: IText) {
    event.stopPropagation();
    if (!this.canvas) return;
    this.canvas.remove(text);
    this.canvas.requestRenderAll();
  }

  // --- MASK & CROP LOGIC ---

  private createOverlayMask() {
    const commonProps = {
        fill: 'rgba(0,0,0,0.7)',
        selectable: false,
        evented: false,
        excludeFromExport: true // Custom prop to identify mask
    };

    this.overlayRects = [
        new Rect({ ...commonProps }),
        new Rect({ ...commonProps }),
        new Rect({ ...commonProps }),
        new Rect({ ...commonProps }),
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

    // Responsive font size
    const fontSize = this.canvas.width * 0.08;

    const text = new IText('Texto', {
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: this.fontControl.value,
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

    this.bringMaskToFront();
  }

  changeFont(font: string) {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (active && active instanceof IText) {
        // Load font
        WebFont.load({
            google: { families: [font] },
            active: () => {
                active.set('fontFamily', font);
                this.canvas?.requestRenderAll();
            }
        });
        active.set('fontFamily', font);
        this.canvas.requestRenderAll();
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
