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

  // We need initial translation/scale for pinch to calculate relative position correctly
  // but we only need to know "where the center point is in content coordinates"
  private initialContentPinchCenter = { x: 0, y: 0 };

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
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;

    // Calculate point on content (unscaled relative to top-left of content)
    // ContentX = (MouseX - TranslateX) / Scale
    const currentTx = this.translate().x;
    const currentTy = this.translate().y;
    const currentScale = this.scale();

    const contentX = (mouseX - currentTx) / currentScale;
    const contentY = (mouseY - currentTy) / currentScale;

    this.scale.set(newScale);

    // Calculate new translation to keep content point at mouse position
    // NewTx = MouseX - (ContentX * NewScale)
    const newTx = mouseX - (contentX * newScale);
    const newTy = mouseY - (contentY * newScale);

    this.translate.set({ x: newTx, y: newTy });
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

      // Calculate pinch center relative to container
      const centerRelX = this.initialPinchCenter.x - containerRect.left;
      const centerRelY = this.initialPinchCenter.y - containerRect.top;

      const currentTx = this.translate().x;
      const currentTy = this.translate().y;

      // Calculate pinch center in content coordinates
      this.initialContentPinchCenter = {
          x: (centerRelX - currentTx) / this.initialPinchScale,
          y: (centerRelY - currentTy) / this.initialPinchScale
      };

      this.initialTx = currentTx;
      this.initialTy = currentTy;
    }
  }

  handleTouchMove(event: TouchEvent, containerRect: DOMRect): void {
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

      // Calculate new center relative to container (if fingers moved)
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      const centerRelX = centerX - containerRect.left;
      const centerRelY = centerY - containerRect.top;

      // NewTx = CurrentCenter - (ContentCenter * NewScale)
      // Note: We use the *initial* content center point, because we want that specific point
      // on the image to stay under the center of the pinch.
      // But if the fingers move (pan while pinch), calculating `centerRelX` dynamically handles it.

      const newTx = centerRelX - (this.initialContentPinchCenter.x * newScale);
      const newTy = centerRelY - (this.initialContentPinchCenter.y * newScale);

      this.translate.set({ x: newTx, y: newTy });
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
    // If scale is 1, maybe we want to center it or allow some pan if content > container?
    // Assuming content fits when scale 1 (object-contain).

    // Calculate scaled dimensions
    const scaledW = contentWidth * scale;
    const scaledH = contentHeight * scale;

    // Determine limits
    // If content > container, we allow panning until edge hits edge.
    // minX = container.width - scaledW (negative)
    // maxX = 0

    // If content < container, we can center it or stick to 0.
    // Let's match typical behavior:

    let minX = 0, maxX = 0;
    if (scaledW > containerRect.width) {
        minX = containerRect.width - scaledW;
        maxX = 0;
    } else {
        // Centering or stick to left?
        // Let's stick to center
        const diff = containerRect.width - scaledW;
        minX = diff / 2;
        maxX = diff / 2;
    }

    let minY = 0, maxY = 0;
    if (scaledH > containerRect.height) {
        minY = containerRect.height - scaledH;
        maxY = 0;
    } else {
        const diff = containerRect.height - scaledH;
        minY = diff / 2;
        maxY = diff / 2;
    }

    // But wait, if we are zooming, we might want to allow some "slop" or "overshoot" during interaction?
    // For now, let's just clamp hard.

    this.translate.update(t => ({
        x: Math.min(Math.max(t.x, minX), maxX),
        y: Math.min(Math.max(t.y, minY), maxY)
    }));
  }
}
