import { WritableSignal } from '@angular/core';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ZoomPanState {
  scale: WritableSignal<number>;
  translateX: WritableSignal<number>;
  translateY: WritableSignal<number>;
}

export interface ZoomPanConfig {
  minScale?: number;
  maxScale?: number;
  zoomSpeed?: number;
  moveThreshold?: number;
}

const DEFAULT_CONFIG: Required<ZoomPanConfig> = {
  minScale: 1,
  maxScale: 5,
  zoomSpeed: 0.15,
  moveThreshold: 5,
};

// ─────────────────────────────────────────────
// Wheel Zoom
// ─────────────────────────────────────────────

export function handleWheelZoom(
  event: Event,
  state: ZoomPanState,
  containerEl: HTMLElement,
  config: ZoomPanConfig = {},
  callbacks?: {
    afterZoom?: () => void;
  },
): void {
  const { minScale, maxScale, zoomSpeed } = { ...DEFAULT_CONFIG, ...config };
  const wheelEvent = event as WheelEvent;

  if (wheelEvent.cancelable) {
    wheelEvent.preventDefault();
  }

  const delta = wheelEvent.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  const newScale = Math.min(
    Math.max(minScale, state.scale() + delta),
    maxScale,
  );

  if (newScale === state.scale()) return;

  const rect = containerEl.getBoundingClientRect();
  const x = wheelEvent.clientX - rect.left;
  const y = wheelEvent.clientY - rect.top;

  const mouseX = x / state.scale();
  const mouseY = y / state.scale();

  state.scale.set(newScale);

  if (newScale <= minScale) {
    state.translateX.set(0);
    state.translateY.set(0);
  } else {
    state.translateX.update(
      (tx) => wheelEvent.clientX - rect.left + tx - mouseX * newScale,
    );
    state.translateY.update(
      (ty) => wheelEvent.clientY - rect.top + ty - mouseY * newScale,
    );
  }

  callbacks?.afterZoom?.();
}

// ─────────────────────────────────────────────
// Constrain Translation
// ─────────────────────────────────────────────

export function constrainTranslation(
  state: ZoomPanState,
  areaEl: HTMLElement | undefined | null,
  contentWidth: number,
  contentHeight: number,
): void {
  const scale = state.scale();

  if (!areaEl || scale <= 1) {
    state.translateX.set(0);
    state.translateY.set(0);
    return;
  }

  const areaRect = areaEl.getBoundingClientRect();
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;

  let minX = 0;
  const maxX = 0;
  if (scaledWidth > areaRect.width) {
    minX = areaRect.width - scaledWidth;
  }

  let minY = 0;
  const maxY = 0;
  if (scaledHeight > areaRect.height) {
    minY = areaRect.height - scaledHeight;
  }

  state.translateX.update((x) => Math.min(maxX, Math.max(x, minX)));
  state.translateY.update((y) => Math.min(maxY, Math.max(y, minY)));
}

// ─────────────────────────────────────────────
// Mouse Pan (editor style: mousedown -> mousemove -> mouseup)
// ─────────────────────────────────────────────

export function setupEditorMousePan(
  event: MouseEvent,
  state: ZoomPanState,
  config: ZoomPanConfig = {},
  callbacks?: {
    onNoMove?: (e: MouseEvent) => void;
    afterMove?: () => void;
  },
): void {
  if (event.button !== 0) return;

  const { moveThreshold } = { ...DEFAULT_CONFIG, ...config };

  const startX = event.clientX;
  const startY = event.clientY;
  const initialTx = state.translateX();
  const initialTy = state.translateY();
  let hasMoved = false;

  const onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
      hasMoved = true;
    }

    if (hasMoved) {
      state.translateX.set(initialTx + dx);
      state.translateY.set(initialTy + dy);
      callbacks?.afterMove?.();
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    if (!hasMoved) {
      callbacks?.onNoMove?.(e);
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

// ─────────────────────────────────────────────
// Touch Pan & Pinch (editor style)
// ─────────────────────────────────────────────

export function setupEditorTouchPanPinch(
  event: Event,
  state: ZoomPanState,
  containerEl: HTMLElement,
  config: ZoomPanConfig = {},
  callbacks?: {
    afterMove?: () => void;
    isDraggingPoint?: () => boolean;
  },
): void {
  const { minScale, maxScale } = { ...DEFAULT_CONFIG, ...config };
  const touchEvent = event as TouchEvent;

  if (callbacks?.isDraggingPoint?.()) return;

  if (touchEvent.touches.length === 2) {
    // Pinch zoom
    const startDist = Math.hypot(
      touchEvent.touches[0].clientX - touchEvent.touches[1].clientX,
      touchEvent.touches[0].clientY - touchEvent.touches[1].clientY,
    );
    const startScale = state.scale();
    const centerX =
      (touchEvent.touches[0].clientX + touchEvent.touches[1].clientX) / 2;
    const centerY =
      (touchEvent.touches[0].clientY + touchEvent.touches[1].clientY) / 2;

    const rect = containerEl.getBoundingClientRect();
    const mouseX = (centerX - rect.left) / startScale;
    const mouseY = (centerY - rect.top) / startScale;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const newScale = Math.min(
        Math.max(minScale, (dist / startDist) * startScale),
        maxScale,
      );

      state.scale.set(newScale);

      if (newScale <= minScale) {
        state.translateX.set(0);
        state.translateY.set(0);
      } else {
        state.translateX.update(
          (tx) => centerX - rect.left + tx - mouseX * newScale,
        );
        state.translateY.update(
          (ty) => centerY - rect.top + ty - mouseY * newScale,
        );
      }

      callbacks?.afterMove?.();
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  } else if (touchEvent.touches.length === 1) {
    // Pan
    const startX = touchEvent.touches[0].clientX;
    const startY = touchEvent.touches[0].clientY;
    const initialTx = state.translateX();
    const initialTy = state.translateY();

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || callbacks?.isDraggingPoint?.()) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      state.translateX.set(initialTx + dx);
      state.translateY.set(initialTy + dy);

      callbacks?.afterMove?.();
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }
}

// ─────────────────────────────────────────────
// Viewer-style zoom/pan (used by topo.ts)
// Converts between separate translateX/Y style and single zoomPosition object
// ─────────────────────────────────────────────

export interface ViewerZoomPanState {
  zoomScale: WritableSignal<number>;
  zoomPosition: WritableSignal<{ x: number; y: number }>;
}

export function handleViewerWheelZoom(
  event: Event,
  state: ViewerZoomPanState,
  config: ZoomPanConfig = {},
): void {
  const { minScale, maxScale, zoomSpeed } = { ...DEFAULT_CONFIG, ...config };
  const wheelEvent = event as WheelEvent;

  if (wheelEvent.cancelable) {
    wheelEvent.preventDefault();
  }

  const delta = wheelEvent.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  const newScale = Math.min(
    Math.max(minScale, state.zoomScale() + delta),
    maxScale,
  );

  if (newScale === state.zoomScale()) return;

  const area = wheelEvent.currentTarget as HTMLElement;
  const container = area.querySelector('.zoom-container') as HTMLElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const x = wheelEvent.clientX - rect.left;
  const y = wheelEvent.clientY - rect.top;

  const mouseX = x / state.zoomScale();
  const mouseY = y / state.zoomScale();

  state.zoomScale.set(newScale);

  if (newScale <= minScale) {
    state.zoomPosition.set({ x: 0, y: 0 });
  } else {
    state.zoomPosition.update((pos) => ({
      x: wheelEvent.clientX - rect.left + pos.x - mouseX * newScale,
      y: wheelEvent.clientY - rect.top + pos.y - mouseY * newScale,
    }));
  }
}

export interface ViewerDragState {
  isDragging: boolean;
  hasMoved: boolean;
  dragStartX: number;
  dragStartY: number;
  initialTx: number;
  initialTy: number;
  initialPinchDist: number;
  initialPinchScale: number;
  initialPinchCenter: { x: number; y: number };
  initialPinchRect: { left: number; top: number };
  initialMouseX: number;
  initialMouseY: number;
}

export function createViewerDragState(): ViewerDragState {
  return {
    isDragging: false,
    hasMoved: false,
    dragStartX: 0,
    dragStartY: 0,
    initialTx: 0,
    initialTy: 0,
    initialPinchDist: 0,
    initialPinchScale: 1,
    initialPinchCenter: { x: 0, y: 0 },
    initialPinchRect: { left: 0, top: 0 },
    initialMouseX: 0,
    initialMouseY: 0,
  };
}

export function handleViewerTouchStart(
  event: Event,
  state: ViewerZoomPanState,
  drag: ViewerDragState,
): void {
  const touchEvent = event as TouchEvent;

  if (touchEvent.touches.length === 1) {
    drag.isDragging = true;
    drag.hasMoved = false;
    drag.dragStartX = touchEvent.touches[0].clientX;
    drag.dragStartY = touchEvent.touches[0].clientY;
    drag.initialTx = state.zoomPosition().x;
    drag.initialTy = state.zoomPosition().y;
  } else if (touchEvent.touches.length === 2) {
    drag.isDragging = false;
    const getDistance = (t1: Touch, t2: Touch) =>
      Math.sqrt(
        Math.pow(t2.clientX - t1.clientX, 2) +
          Math.pow(t2.clientY - t1.clientY, 2),
      );

    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    drag.initialPinchDist = getDistance(
      touchEvent.touches[0],
      touchEvent.touches[1],
    );
    drag.initialPinchScale = state.zoomScale();
    drag.initialPinchCenter = getCenter(
      touchEvent.touches[0],
      touchEvent.touches[1],
    );

    const area = touchEvent.currentTarget as HTMLElement;
    const container = area.querySelector('.zoom-container') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    drag.initialPinchRect = { left: rect.left, top: rect.top };

    const centerRelX = drag.initialPinchCenter.x - rect.left;
    const centerRelY = drag.initialPinchCenter.y - rect.top;
    drag.initialMouseX = centerRelX / drag.initialPinchScale;
    drag.initialMouseY = centerRelY / drag.initialPinchScale;
    drag.initialTx = state.zoomPosition().x;
    drag.initialTy = state.zoomPosition().y;
  }
}

export function handleViewerTouchMove(
  event: Event,
  state: ViewerZoomPanState,
  drag: ViewerDragState,
  config: ZoomPanConfig = {},
): void {
  const { minScale, maxScale, moveThreshold } = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const touchEvent = event as TouchEvent;

  if (touchEvent.touches.length === 1 && drag.isDragging) {
    const dx = touchEvent.touches[0].clientX - drag.dragStartX;
    const dy = touchEvent.touches[0].clientY - drag.dragStartY;

    if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      touchEvent.preventDefault();
      state.zoomPosition.set({
        x: drag.initialTx + dx,
        y: drag.initialTy + dy,
      });
    }
  } else if (touchEvent.touches.length === 2) {
    touchEvent.preventDefault();
    const getDistance = (t1: Touch, t2: Touch) =>
      Math.sqrt(
        Math.pow(t2.clientX - t1.clientX, 2) +
          Math.pow(t2.clientY - t1.clientY, 2),
      );

    const dist = getDistance(touchEvent.touches[0], touchEvent.touches[1]);
    const newScale = Math.min(
      Math.max(
        minScale,
        (dist / drag.initialPinchDist) * drag.initialPinchScale,
      ),
      maxScale,
    );

    state.zoomScale.set(newScale);

    if (newScale <= minScale) {
      state.zoomPosition.set({ x: 0, y: 0 });
    } else {
      state.zoomPosition.set({
        x:
          drag.initialPinchCenter.x -
          drag.initialPinchRect.left +
          drag.initialTx -
          drag.initialMouseX * newScale,
        y:
          drag.initialPinchCenter.y -
          drag.initialPinchRect.top +
          drag.initialTy -
          drag.initialMouseY * newScale,
      });
    }
  }
}

export function handleViewerMouseDown(
  event: MouseEvent,
  state: ViewerZoomPanState,
  drag: ViewerDragState,
): void {
  if (event.button !== 0) return;
  drag.isDragging = true;
  drag.hasMoved = false;
  drag.dragStartX = event.clientX;
  drag.dragStartY = event.clientY;
  drag.initialTx = state.zoomPosition().x;
  drag.initialTy = state.zoomPosition().y;
}

export function handleViewerMouseMove(
  event: MouseEvent,
  state: ViewerZoomPanState,
  drag: ViewerDragState,
  config: ZoomPanConfig = {},
): void {
  if (!drag.isDragging) return;
  const { moveThreshold } = { ...DEFAULT_CONFIG, ...config };

  const dx = event.clientX - drag.dragStartX;
  const dy = event.clientY - drag.dragStartY;

  if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
    drag.hasMoved = true;
  }

  if (drag.hasMoved) {
    event.preventDefault();
    state.zoomPosition.set({
      x: drag.initialTx + dx,
      y: drag.initialTy + dy,
    });
  }
}

// ─────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────

export function resetZoomState(state: ZoomPanState): void {
  state.scale.set(1);
  state.translateX.set(0);
  state.translateY.set(0);
}

export function resetViewerZoomState(state: ViewerZoomPanState): void {
  state.zoomScale.set(1);
  state.zoomPosition.set({ x: 0, y: 0 });
}

export function attachWheelListener(
  areaEl: HTMLElement | undefined | null,
  handler: (e: Event) => void,
): void {
  if (areaEl && !('_wheelAttached' in areaEl)) {
    areaEl.addEventListener('wheel', handler, { passive: false });
    (areaEl as { _wheelAttached?: boolean })._wheelAttached = true;
  }
}
