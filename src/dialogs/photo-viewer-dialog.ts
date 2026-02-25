import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

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
} from '../utils/zoom-pan.utils';

export interface PhotoViewerData {
  imageUrl: string;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon],
  template: `
    <div
      class="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden touch-none p-0 bg-black/80 backdrop-blur-xl cursor-grab active:cursor-grabbing"
      (wheel.zoneless)="onWheel($event)"
      (touchstart.zoneless)="onTouchStart($any($event))"
      (touchmove.zoneless)="onTouchMove($any($event))"
      (touchend.zoneless)="onTouchEnd()"
      (mousedown.zoneless)="onMouseDown($any($event))"
      (mousemove.zoneless)="onMouseMove($any($event))"
      (mouseup.zoneless)="onMouseUp()"
      (mouseleave.zoneless)="onMouseUp()"
      (click)="onBackgroundClick()"
      (keydown.enter)="onBackgroundClick()"
      (keydown.space)="onBackgroundClick()"
      tabindex="0"
      role="button"
    >
      <div
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
          [src]="context.data.imageUrl"
          class="max-w-[100dvw] max-h-[100dvh] block object-contain shadow-2xl rounded-2xl"
          alt="Photo preview"
          draggable="false"
          (load)="resetZoom()"
        />
      </div>

      <!-- Close button -->
      <div class="absolute top-4 right-4 z-[1001]">
        <button
          tuiIconButton
          appearance="floating"
          size="l"
          class="bg-[var(--tui-background-base)] rounded-full"
          (click)="context.completeWith(); $event.stopPropagation()"
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

  protected readonly dragState: ViewerDragState = createViewerDragState();

  protected resetZoom(): void {
    resetViewerZoomState(this.viewerState);
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  protected onWheel(event: Event): void {
    handleViewerWheelZoom(event, this.viewerState);
  }

  protected onTouchStart(event: Event): void {
    handleViewerTouchStart(event, this.viewerState, this.dragState);
  }

  protected onTouchMove(event: Event): void {
    handleViewerTouchMove(event, this.viewerState, this.dragState);
  }

  protected onTouchEnd(): void {
    this.dragState.isDragging = false;
  }

  protected onMouseDown(event: MouseEvent): void {
    handleViewerMouseDown(event, this.viewerState, this.dragState);
  }

  protected onMouseMove(event: MouseEvent): void {
    handleViewerMouseMove(event, this.viewerState, this.dragState);
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
