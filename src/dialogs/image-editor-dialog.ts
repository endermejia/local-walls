import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageCropperComponent,
    TuiButton,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col h-full gap-4" style="max-height: 80vh">
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
            [appearance]="aspectRatio() === 1.91 ? 'primary' : 'secondary'"
            (click)="setRatio(1.91)"
          >
            1.91:1
          </button>
        </div>

        <!-- Text Input -->
        <tui-textfield iconStart="@tui.type">
          <input
            tuiInput
            [(ngModel)]="text"
            placeholder="Añadir texto..."
          />
        </tui-textfield>

        <!-- Preview (Miniature) if text is present -->
        <div *ngIf="text()" class="text-center">
            <p class="text-xs opacity-70 mb-1">Previsualización del texto:</p>
            <div class="relative inline-block border border-gray-300 rounded overflow-hidden" style="max-height: 100px;">
                <img [src]="currentPreviewUrl()" class="h-full object-contain" style="max-height: 100px;">
                <div
                    class="absolute bottom-1 w-full text-center text-white font-bold pointer-events-none px-1"
                    style="text-shadow: 1px 1px 2px black, 0 0 1em black;"
                >
                    {{ text() }}
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
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
        max-width: 600px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorDialogComponent {
  private readonly context = injectContext<TuiDialogContext<File | null, File>>();

  protected readonly file = this.context.data;
  protected readonly aspectRatio = signal(1); // Default 1:1
  protected readonly text = signal('');
  protected readonly currentPreviewUrl = signal<string | null>(null);

  private croppedBlob: Blob | null | undefined = null;

  setRatio(ratio: number) {
    this.aspectRatio.set(ratio);
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedBlob = event.blob;
    if (event.objectUrl) {
        this.currentPreviewUrl.set(event.objectUrl);
    }
  }

  async save() {
    if (!this.croppedBlob) {
      this.cancel();
      return;
    }

    const finalBlob = await this.processImage(this.croppedBlob, this.text());

    // Convert Blob to File
    const finalFile = new File([finalBlob], this.file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    this.context.completeWith(finalFile);
  }

  cancel() {
    this.context.completeWith(null);
  }

  private processImage(blob: Blob, text: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!text) {
        resolve(blob);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(blob);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Draw text
        const fontSize = Math.max(24, Math.floor(canvas.width / 20)); // Responsive font size
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = Math.max(2, fontSize / 10);

        const x = canvas.width / 2;
        const y = canvas.height - (fontSize * 1.5); // Bottom margin

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        // Export
        canvas.toBlob(
          (result) => {
            URL.revokeObjectURL(url);
            if (result) resolve(result);
            else resolve(blob);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob);
      };

      img.src = url;
    });
  }
}
