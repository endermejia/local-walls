import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface PhotoViewerData {
  imageUrl: string;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  template: `
    <div
      class="flex items-center justify-center p-0 overflow-hidden bg-transparent"
    >
      <img
        [src]="context.data.imageUrl"
        class="max-w-full max-h-[85vh] block object-contain shadow-2xl rounded-2xl"
        alt="Photo preview"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PhotoViewerDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, PhotoViewerData>>();
}

export default PhotoViewerDialogComponent;
