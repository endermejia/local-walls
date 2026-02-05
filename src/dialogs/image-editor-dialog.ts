import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

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
}

@Component({
  selector: 'app-image-editor-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full h-full min-h-[600px] bg-white text-black"
      #editorContainer
    ></div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 600px;
      }
    `,
  ],
})
export class ImageEditorDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true })
  container!: ElementRef<HTMLDivElement>;
  private editor: any;

  constructor(
    @Inject(POLYMORPHEUS_CONTEXT)
    private readonly context: TuiDialogContext<File | null, ImageEditorConfig>,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const data = this.context.data;
    let source = data.imageUrl;
    if (data.file) {
      source = URL.createObjectURL(data.file);
    }

    if (!source) {
      this.context.completeWith(null);
      return;
    }

    const { default: FilerobotImageEditor } = await import(
      // @ts-ignore
      'filerobot-image-editor'
    );
    const { TABS, TOOLS } = FilerobotImageEditor as any;

    let presetsItems: any[] = [];

    if (data.aspectRatios && data.aspectRatios.length > 0) {
      presetsItems = data.aspectRatios.map((r) => ({
        titleKey: r.titleKey,
        descriptionKey: r.descriptionKey,
        ratio: r.ratio,
      }));
    } else {
      // Default fallback
      presetsItems = [
        {
          titleKey: 'square',
          descriptionKey: '1:1',
          ratio: 1,
        },
        {
          titleKey: 'portrait',
          descriptionKey: '4:5',
          ratio: 4 / 5,
        },
        {
          titleKey: 'landscape',
          descriptionKey: '16:9',
          ratio: 16 / 9,
        },
      ];
    }

    const config = {
      source,
      onSave: (editedImageObject: any, designState: any) => {
        fetch(editedImageObject.imageBase64)
          .then((res) => res.blob())
          .then((blob) => {
            const fileName =
              editedImageObject.fullName || (data.file?.name ?? 'image.jpg');
            // Ensure proper mimetype
            const mimeType = editedImageObject.mimeType || 'image/jpeg';
            const file = new File([blob], fileName, { type: mimeType });
            this.context.completeWith(file);
          })
          .catch((err) => {
            console.error('[ImageEditor] Error creating file from blob', err);
          });
      },
      onClose: (closingReason: string) => {
        if (closingReason === 'close-button') {
          this.context.completeWith(null);
        }
      },
      Crop: {
        presetsItems,
        // If we want to enforce specific ratios, we rely on presets.
        // There isn't a strict "disable custom" mode easily exposed without custom CSS or deep config,
        // but providing presets is usually enough guidance.
        // If forceAspectRatio is set, we might want to default to that ratio.
        ratio:
          data.forceAspectRatio && presetsItems.length > 0
            ? presetsItems[0].ratio
            : undefined,
      },
      tabsIds: [
        TABS.ADJUST,
        TABS.ANNOTATE,
        TABS.FILTERS,
        TABS.RESIZE,
        TABS.FINETUNE,
      ],
      defaultTabId: TABS.ADJUST,
      defaultToolId: TOOLS.CROP,
      // Theme adjustments if needed
      theme: {
        typography: {
          fontFamily: 'Manrope, Arial, sans-serif',
        },
      },
    };

    this.editor = new (FilerobotImageEditor as any)(
      this.container.nativeElement,
      config,
    );
    this.editor.render();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.terminate();
    }
  }
}
