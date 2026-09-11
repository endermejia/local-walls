import { WritableSignal } from '@angular/core';

import {
  centerViewerOnPoint,
  createViewerDragState,
  handleViewerMouseDown,
  handleViewerMouseMove,
  handleViewerTouchMove,
  handleViewerTouchStart,
  handleViewerWheelZoom,
  ViewerDragState,
  ViewerElements,
  ViewerZoomPanState,
} from './zoom-pan.utils';

export type ZoomPanElementsGetter = () => ViewerElements | null;

export class ZoomPanController {
  readonly dragState: ViewerDragState = createViewerDragState();
  readonly viewerState: ViewerZoomPanState;
  private lastDragEndTime = 0;

  constructor(
    public readonly zoomScale: WritableSignal<number>,
    public readonly zoomPosition: WritableSignal<{ x: number; y: number }>,
    private readonly getElements: ZoomPanElementsGetter,
    private readonly getMinScale: () => number,
  ) {
    this.viewerState = {
      zoomScale: this.zoomScale,
      zoomPosition: this.zoomPosition,
    };
  }

  resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomPosition.set({ x: 0, y: 0 });
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  onWheel(event: Event): void {
    const el = this.getElements();
    if (!el) return;
    handleViewerWheelZoom(event, this.viewerState, el, {
      minScale: this.getMinScale(),
    });
  }

  onTouchStart(event: Event): void {
    const el = this.getElements();
    if (!el) return;
    handleViewerTouchStart(event, this.viewerState, this.dragState, el);
  }

  onTouchMove(event: Event): void {
    const el = this.getElements();
    if (!el) return;
    handleViewerTouchMove(event, this.viewerState, this.dragState, el, {
      minScale: this.getMinScale(),
    });
  }

  onTouchEnd(): void {
    if (this.dragState.hasMoved) {
      this.lastDragEndTime = Date.now();
    }
    this.dragState.isDragging = false;
  }

  onMouseDown(event: Event): void {
    handleViewerMouseDown(
      event as MouseEvent,
      this.viewerState,
      this.dragState,
    );
  }

  onMouseMove(event: Event): void {
    const el = this.getElements();
    if (!el) return;
    handleViewerMouseMove(
      event as MouseEvent,
      this.viewerState,
      this.dragState,
      el,
    );
  }

  onMouseUp(): void {
    if (this.dragState.hasMoved) {
      this.lastDragEndTime = Date.now();
    }
    this.dragState.isDragging = false;
  }

  wasRecentlyDragging(cooldownMs = 300): boolean {
    return (
      this.dragState.hasMoved || Date.now() - this.lastDragEndTime < cooldownMs
    );
  }

  centerOnPoint(
    point: { x: number; y: number },
    elements?: ViewerElements | null,
  ): void {
    const el = elements || this.getElements();
    if (!el) return;
    centerViewerOnPoint(this.viewerState, point, el);
  }
}
