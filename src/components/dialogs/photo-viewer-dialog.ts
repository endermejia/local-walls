import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import {
  createViewerDragState,
  handleViewerMouseDown,
  handleViewerMouseMove,
  handleViewerTouchMove,
  handleViewerTouchStart,
  resetViewerZoomState,
  handleViewerWheelZoom,
  ViewerDragState,
  ViewerZoomPanState,
} from '../../utils/zoom-pan.utils';

export interface PhotoViewerData {
  imageUrl: string;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TuiButton, TuiIcon],
  template: `
    <div
      #container
      class="fixed inset-0 z-1000 flex items-center justify-center overflow-hidden touch-none p-0 bg-black/80 backdrop-blur-xl cursor-grab active:cursor-grabbing"
      (wheel.zoneless)="onWheel($event)"
      (touchstart.zoneless)="onTouchStart($event)"
      (touchmove.zoneless)="onTouchMove($event)"
      (touchend.zoneless)="onTouchEnd()"
      (mousedown.zoneless)="onMouseDown($event)"
      (mousemove.zoneless)="onMouseMove($event)"
      (mouseup.zoneless)="onMouseUp()"
      (mouseleave.zoneless)="onMouseUp()"
      (click)="onBackgroundClick()"
      (keydown.enter)="onBackgroundClick()"
      (keydown.space)="onBackgroundClick()"
      tabindex="0"
      role="button"
    >
      <div
        #zoomContainer
        class="relative transition-transform duration-75 ease-out outline-none zoom-container origin-top-left"
        [class.!duration-0]="dragState.isDragging"
        tabindex="-1"
        (click)="$event.stopPropagation()"
        (keydown.enter)="$event.stopPropagation()"
        (keydown.space)="$event.stopPropagation()"
        [style.transform]="
          'translate(' +
          zoomPosition().x +
          'px, ' +
          zoomPosition().y +
          'px) scale(' +
          zoomScale() +
          ')'
        "
      >
        <img
          #img
          [src]="context.data.imageUrl"
          class="max-w-dvw max-h-dvh block object-contain shadow-2xl rounded-2xl"
          alt="Photo preview"
          draggable="false"
          (load)="resetZoom()"
        />
      </div>

      <!-- Close button -->
      <div class="absolute top-4 right-4 z-1001">
        <button
          tuiIconButton
          appearance="floating"
          size="l"
          class="bg-(--tui-background-base) rounded-full"
          (click)="context.completeWith(); $event.stopPropagation()"
          [attr.aria-label]="'close' | translate"
        >
          <tui-icon icon="@tui.x" />
        </button>
      </div>
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

  protected readonly zoomScale = signal(1);
  protected readonly zoomPosition = signal({ x: 0, y: 0 });

  protected readonly viewerState: ViewerZoomPanState = {
    zoomScale: this.zoomScale,
    zoomPosition: this.zoomPosition,
  };

  protected readonly container =
    viewChild<ElementRef<HTMLElement>>('container');
  protected readonly zoomContainer =
    viewChild<ElementRef<HTMLElement>>('zoomContainer');
  protected readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  protected getViewerElements() {
    const c = this.container()?.nativeElement;
    const z = this.zoomContainer()?.nativeElement;
    const i = this.img()?.nativeElement;
    if (!c || !z || !i) return null;
    return { container: c, zoomContainer: z, img: i };
  }

  protected readonly dragState: ViewerDragState = createViewerDragState();

  protected resetZoom(): void {
    resetViewerZoomState(this.viewerState);
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  protected onWheel(event: Event): void {
    const el = this.getViewerElements();
    if (el) handleViewerWheelZoom(event, this.viewerState, el);
  }

  protected onTouchStart(event: Event): void {
    const el = this.getViewerElements();
    if (el) handleViewerTouchStart(event, this.viewerState, this.dragState, el);
  }

  protected onTouchMove(event: Event): void {
    const el = this.getViewerElements();
    if (el) handleViewerTouchMove(event, this.viewerState, this.dragState, el);
  }

  protected onTouchEnd(): void {
    this.dragState.isDragging = false;
  }

  protected onMouseDown(event: Event): void {
    handleViewerMouseDown(
      event as MouseEvent,
      this.viewerState,
      this.dragState,
    );
  }

  protected onMouseMove(event: Event): void {
    const el = this.getViewerElements();
    if (el)
      handleViewerMouseMove(
        event as MouseEvent,
        this.viewerState,
        this.dragState,
        el,
      );
  }

  protected onMouseUp(): void {
    this.dragState.isDragging = false;
  }

  protected onBackgroundClick(): void {
    if (!this.dragState.hasMoved) {
      this.context.completeWith();
    }
  }
}

export default PhotoViewerDialogComponent;
