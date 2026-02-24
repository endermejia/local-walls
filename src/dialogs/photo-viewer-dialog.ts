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
          class="max-w-[90vw] max-h-[85vh] block object-contain shadow-2xl rounded-2xl "
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
    const zoomSpeed = 0.15;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.min(Math.max(1, this.zoomScale() + delta), 5);

    if (newScale === this.zoomScale()) return;

    const area = event.currentTarget as HTMLElement;
    const container = area.querySelector('div') as HTMLElement; // First div inside
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const mouseX = x / this.zoomScale();
    const mouseY = y / this.zoomScale();

    this.zoomScale.set(newScale);

    if (newScale === 1) {
      this.resetZoom();
    } else {
      this.zoomPosition.update((pos) => ({
        x: event.clientX - rect.left + pos.x - mouseX * newScale,
        y: event.clientY - rect.top + pos.y - mouseY * newScale,
      }));
    }
  }

  private initialPinchDist = 0;
  private initialPinchScale = 1;
  private initialPinchCenter = { x: 0, y: 0 };
  private initialPinchRect = { left: 0, top: 0 };
  private initialMouseX = 0;
  private initialMouseY = 0;
  private initialTx = 0;
  private initialTy = 0;

  private isPanning = false;
  private lastTouchPos = { x: 0, y: 0 };

  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.isPanning = false;
      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2),
        );

      const getCenter = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      });

      this.initialPinchDist = getDistance(event.touches[0], event.touches[1]);
      this.initialPinchScale = this.zoomScale();
      this.initialPinchCenter = getCenter(event.touches[0], event.touches[1]);

      const area = event.currentTarget as HTMLElement;
      const container = area.querySelector('div') as HTMLElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      this.initialPinchRect = { left: rect.left, top: rect.top };

      const centerRelX = this.initialPinchCenter.x - rect.left;
      const centerRelY = this.initialPinchCenter.y - rect.top;
      this.initialMouseX = centerRelX / this.initialPinchScale;
      this.initialMouseY = centerRelY / this.initialPinchScale;
      this.initialTx = this.zoomPosition().x;
      this.initialTy = this.zoomPosition().y;
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
      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2),
        );

      const dist = getDistance(event.touches[0], event.touches[1]);
      const newScale = Math.min(
        Math.max(1, (dist / this.initialPinchDist) * this.initialPinchScale),
        5,
      );

      this.zoomScale.set(newScale);

      this.zoomPosition.set({
        x:
          this.initialPinchCenter.x -
          this.initialPinchRect.left +
          this.initialTx -
          this.initialMouseX * newScale,
        y:
          this.initialPinchCenter.y -
          this.initialPinchRect.top +
          this.initialTy -
          this.initialMouseY * newScale,
      });
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
  }
}

export default PhotoViewerDialogComponent;
