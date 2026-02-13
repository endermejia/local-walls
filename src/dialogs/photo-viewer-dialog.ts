import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
      class="fixed inset-0 flex items-center justify-center overflow-hidden touch-none p-0 bg-transparent"
      (wheel.zoneless)="onWheel($any($event))"
      (touchstart.zoneless)="onTouchStart($any($event))"
      (touchmove.zoneless)="onTouchMove($any($event))"
      (touchend.zoneless)="onTouchEnd()"
      (click)="context.completeWith()"
      (keydown.enter)="context.completeWith()"
      (keydown.space)="context.completeWith()"
      tabindex="0"
      role="button"
    >
      <div
        class="relative transition-transform duration-75 ease-out outline-none"
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
          class="max-w-[90vw] max-h-[85vh] block object-contain shadow-2xl rounded-2xl select-none"
          alt="Photo preview"
        />
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

  protected resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomPosition.set({ x: 0, y: 0 });
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = -event.deltaY;
    const factor = 0.1;
    const newScale = Math.min(
      Math.max(1, this.zoomScale() + (delta > 0 ? factor : -factor)),
      5,
    );

    if (newScale === 1) {
      this.resetZoom();
    } else {
      this.zoomScale.set(newScale);
    }
  }

  private lastTouchDistance = 0;
  private isPanning = false;
  private lastTouchPos = { x: 0, y: 0 };

  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.lastTouchDistance = this.getTouchDistance(event.touches);
    } else if (event.touches.length === 1 && this.zoomScale() > 1) {
      this.isPanning = true;
      this.lastTouchPos = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  protected onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      const distance = this.getTouchDistance(event.touches);
      const delta = distance - this.lastTouchDistance;
      const factor = 0.01;
      const newScale = Math.min(
        Math.max(1, this.zoomScale() + delta * factor),
        5,
      );

      this.zoomScale.set(newScale);
      this.lastTouchDistance = distance;
      if (newScale === 1) this.resetZoom();
    } else if (event.touches.length === 1 && this.isPanning) {
      event.preventDefault();
      const touch = event.touches[0];
      const dx = touch.clientX - this.lastTouchPos.x;
      const dy = touch.clientY - this.lastTouchPos.y;

      this.zoomPosition.update((pos) => ({
        x: pos.x + dx,
        y: pos.y + dy,
      }));
      this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
    }
  }

  protected onTouchEnd(): void {
    this.isPanning = false;
    this.lastTouchDistance = 0;
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default PhotoViewerDialogComponent;
