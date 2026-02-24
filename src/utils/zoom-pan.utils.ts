import { signal } from '@angular/core';

export class ZoomPanHandler {
  readonly scale = signal(1);
  readonly translate = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);

  // Expose hasMoved to allow distinguishing between click and drag
  readonly hasMoved = signal(false);

  private dragStartX = 0;
  private dragStartY = 0;
  private initialTx = 0;
  private initialTy = 0;

  private initialPinchDist = 0;
  private initialPinchScale = 1;
  private initialPinchCenter = { x: 0, y: 0 };
  private initialPinchRect = { left: 0, top: 0 };
  private initialMouseX = 0;
  private initialMouseY = 0;

  constructor(
    public minScale = 1,
    public maxScale = 5
  ) {}

  reset() {
    this.scale.set(1);
    this.translate.set({ x: 0, y: 0 });
    this.isDragging.set(false);
    this.hasMoved.set(false);
  }

  handleWheel(event: WheelEvent, containerRect: DOMRect): void {
    if (event.cancelable) {
      event.preventDefault();
    }

    const zoomSpeed = 0.15;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.min(Math.max(this.minScale, this.scale() + delta), this.maxScale);

    if (newScale === this.scale()) return;

    // Calculate mouse position relative to container
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    // Normalize mouse position relative to current scale
    const mouseX = x / this.scale();
    const mouseY = y / this.scale();

    this.scale.set(newScale);

    if (newScale === 1) {
      this.translate.set({ x: 0, y: 0 });
    } else {
      this.translate.update((pos) => ({
        x: event.clientX - containerRect.left + pos.x - mouseX * newScale,
        y: event.clientY - containerRect.top + pos.y - mouseY * newScale,
      }));
    }
  }

  handleTouchStart(event: TouchEvent, containerRect: DOMRect): void {
    if (event.touches.length === 1) {
      this.isDragging.set(true);
      this.hasMoved.set(false);
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;
      this.initialTx = this.translate().x;
      this.initialTy = this.translate().y;
    } else if (event.touches.length === 2) {
      this.isDragging.set(false);

      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2)
        );

      const getCenter = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      });

      this.initialPinchDist = getDistance(
        event.touches[0],
        event.touches[1]
      );
      this.initialPinchScale = this.scale();
      this.initialPinchCenter = getCenter(
        event.touches[0],
        event.touches[1]
      );

      this.initialPinchRect = { left: containerRect.left, top: containerRect.top };

      const centerRelX = this.initialPinchCenter.x - containerRect.left;
      const centerRelY = this.initialPinchCenter.y - containerRect.top;
      this.initialMouseX = centerRelX / this.initialPinchScale;
      this.initialMouseY = centerRelY / this.initialPinchScale;
      this.initialTx = this.translate().x;
      this.initialTy = this.translate().y;
    }
  }

  handleTouchMove(event: TouchEvent, containerRect?: DOMRect): void {
    if (event.touches.length === 1 && this.isDragging()) {
      const dx = event.touches[0].clientX - this.dragStartX;
      const dy = event.touches[0].clientY - this.dragStartY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.hasMoved.set(true);
      }

      if (this.hasMoved()) {
        event.preventDefault();
        this.translate.set({
          x: this.initialTx + dx,
          y: this.initialTy + dy,
        });
      }
    } else if (event.touches.length === 2) {
      event.preventDefault();
      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2)
        );

      const dist = getDistance(event.touches[0], event.touches[1]);
      const newScale = Math.min(
        Math.max(this.minScale, (dist / this.initialPinchDist) * this.initialPinchScale),
        this.maxScale
      );

      this.scale.set(newScale);

      if (newScale === 1) {
        this.translate.set({ x: 0, y: 0 });
      } else {
        this.translate.set({
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
      }
    }
  }

  handleTouchEnd(): void {
    this.isDragging.set(false);
  }

  handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isDragging.set(true);
    this.hasMoved.set(false);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialTx = this.translate().x;
    this.initialTy = this.translate().y;
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.hasMoved.set(true);
    }

    if (this.hasMoved()) {
      event.preventDefault();
      this.translate.set({
        x: this.initialTx + dx,
        y: this.initialTy + dy,
      });
    }
  }

  handleMouseUp(): void {
    this.isDragging.set(false);
  }

  constrainTranslation(containerRect: DOMRect, contentWidth: number, contentHeight: number): void {
    const scale = this.scale();
    if (scale <= 1) {
      this.translate.set({ x: 0, y: 0 });
      return;
    }

    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    let minX = 0;
    let maxX = 0;

    if (scaledWidth > containerRect.width) {
      minX = containerRect.width - scaledWidth;
      maxX = 0;
    }

    let minY = 0;
    let maxY = 0;

    if (scaledHeight > containerRect.height) {
      minY = containerRect.height - scaledHeight;
      maxY = 0;
    }

    this.translate.update(pos => ({
      x: Math.min(maxX, Math.max(pos.x, minX)),
      y: Math.min(maxY, Math.max(pos.y, minY))
    }));
  }
}
