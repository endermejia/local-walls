export interface NormalizedPoint {
  x: number;
  y: number;
}

export function getNormalizedPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

export function setupMouseDrag(
  event: MouseEvent,
  containerElement: HTMLElement,
  callbacks: {
    onDrag: (point: NormalizedPoint) => void;
    onEnd: () => void;
  },
): void {
  event.stopPropagation();
  event.preventDefault();

  const onMouseMove = (e: MouseEvent) => {
    const rect = containerElement.getBoundingClientRect();
    const point = getNormalizedPosition(e.clientX, e.clientY, rect);
    callbacks.onDrag(point);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    callbacks.onEnd();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

export function setupTouchDrag(
  event: TouchEvent,
  containerElement: HTMLElement,
  callbacks: {
    onDrag: (point: NormalizedPoint) => void;
    onLongPress?: () => void;
    onEnd: () => void;
  },
  config: {
    longPressDelay?: number;
    moveThreshold?: number;
  } = {},
): void {
  event.stopPropagation();
  event.preventDefault();

  const { longPressDelay = 600, moveThreshold = 10 } = config;
  const startX = event.touches[0].clientX;
  const startY = event.touches[0].clientY;
  let isLongPress = false;

  const longPressTimeout = callbacks.onLongPress
    ? setTimeout(() => {
        isLongPress = true;
        callbacks.onLongPress!();
        onTouchEnd();
      }, longPressDelay)
    : null;

  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (longPressTimeout) {
      const dist = Math.sqrt(
        Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2),
      );
      if (dist > moveThreshold) {
        clearTimeout(longPressTimeout);
      }
    }

    if (isLongPress) return;

    e.preventDefault();
    const rect = containerElement.getBoundingClientRect();
    const point = getNormalizedPosition(touch.clientX, touch.clientY, rect);
    callbacks.onDrag(point);
  };

  const onTouchEnd = () => {
    if (longPressTimeout) clearTimeout(longPressTimeout);

    window.removeEventListener(
      'touchmove',
      onTouchMove as EventListenerOrEventListenerObject,
    );
    window.removeEventListener('touchend', onTouchEnd);

    if (!isLongPress) {
      callbacks.onEnd();
    }
  };

  window.addEventListener(
    'touchmove',
    onTouchMove as EventListenerOrEventListenerObject,
    { passive: false },
  );
  window.addEventListener('touchend', onTouchEnd);
}

export function removePoint(
  event: Event,
  routeId: number,
  index: number,
  pathsMap: Map<number, { points: NormalizedPoint[] }>,
): void {
  if (event instanceof MouseEvent || event.cancelable) {
    event.preventDefault();
  }
  event.stopPropagation();
  const pathData = pathsMap.get(routeId);
  if (pathData) {
    pathData.points.splice(index, 1);
    pathsMap.set(routeId, { ...pathData });
  }
}

/**
 * Adds a point to a route path based on a mouse event's position
 * relative to a container element, accounting for scale.
 */
export function addPointToPath(
  event: MouseEvent,
  routeId: number,
  containerEl: HTMLElement,
  scale: number,
  contentWidth: number,
  contentHeight: number,
  pathsMap: Map<
    number,
    { points: NormalizedPoint[]; color?: string; [key: string]: unknown }
  >,
  defaults?: { color?: string; [key: string]: unknown },
): void {
  const rect = containerEl.getBoundingClientRect();
  const x = (event.clientX - rect.left) / scale;
  const y = (event.clientY - rect.top) / scale;

  const coords: NormalizedPoint = {
    x: Math.max(0, Math.min(1, x / contentWidth)),
    y: Math.max(0, Math.min(1, y / contentHeight)),
  };

  const current = pathsMap.get(routeId) || { points: [], ...defaults };
  pathsMap.set(routeId, {
    ...current,
    points: [...current.points, coords],
  });
}

/**
 * Sets up mouse-based point dragging for path editing.
 * Returns a cleanup callback.
 */
export function startDragPointMouse(
  event: MouseEvent,
  routeId: number,
  index: number,
  containerEl: HTMLElement,
  scale: number,
  contentWidth: number,
  contentHeight: number,
  pathsMap: Map<number, { points: NormalizedPoint[]; [key: string]: unknown }>,
  callbacks?: {
    onUpdate?: () => void;
    onEnd?: () => void;
  },
): void {
  const pathData = pathsMap.get(routeId);
  if (!pathData) return;

  const point = pathData.points[index];
  let rafId: number | null = null;
  let pendingUpdate = false;

  const onMouseMove = (e: MouseEvent) => {
    const rect = containerEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    point.x = Math.max(0, Math.min(1, x / contentWidth));
    point.y = Math.max(0, Math.min(1, y / contentHeight));

    if (!pendingUpdate) {
      pendingUpdate = true;
      rafId = requestAnimationFrame(() => {
        callbacks?.onUpdate?.();
        pendingUpdate = false;
      });
    }
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    if (rafId !== null) cancelAnimationFrame(rafId);
    pathsMap.set(routeId, { ...pathData });
    callbacks?.onEnd?.();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  event.stopPropagation();
  event.preventDefault();
}

/**
 * Sets up touch-based point dragging for path editing.
 */
export function startDragPointTouch(
  event: TouchEvent,
  routeId: number,
  index: number,
  containerEl: HTMLElement,
  scale: number,
  contentWidth: number,
  contentHeight: number,
  pathsMap: Map<number, { points: NormalizedPoint[]; [key: string]: unknown }>,
  callbacks?: {
    onUpdate?: () => void;
    onEnd?: () => void;
    onLongPress?: () => void;
  },
  config?: { longPressDelay?: number; moveThreshold?: number },
): void {
  if (event.touches.length > 1) return;

  const { longPressDelay = 600, moveThreshold = 10 } = config || {};
  const pathData = pathsMap.get(routeId);
  if (!pathData) return;

  const point = pathData.points[index];
  let rafId: number | null = null;
  let pendingUpdate = false;
  let isLongPress = false;

  const startX = event.touches[0].clientX;
  const startY = event.touches[0].clientY;

  const longPressTimeout = callbacks?.onLongPress
    ? setTimeout(() => {
        isLongPress = true;
        callbacks.onLongPress!();
        cleanup();
      }, longPressDelay)
    : null;

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    if (longPressTimeout) {
      const dist = Math.sqrt(
        Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2),
      );
      if (dist > moveThreshold) {
        clearTimeout(longPressTimeout);
      }
    }

    if (isLongPress) return;

    e.preventDefault();
    const rect = containerEl.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / scale;
    const y = (touch.clientY - rect.top) / scale;

    point.x = Math.max(0, Math.min(1, x / contentWidth));
    point.y = Math.max(0, Math.min(1, y / contentHeight));

    if (!pendingUpdate) {
      pendingUpdate = true;
      rafId = requestAnimationFrame(() => {
        callbacks?.onUpdate?.();
        pendingUpdate = false;
      });
    }
  };

  const cleanup = () => {
    window.removeEventListener(
      'touchmove',
      onTouchMove as EventListenerOrEventListenerObject,
    );
    window.removeEventListener('touchend', onTouchEnd);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };

  const onTouchEnd = () => {
    if (longPressTimeout) clearTimeout(longPressTimeout);
    cleanup();
    if (!isLongPress) {
      pathsMap.set(routeId, { ...pathData });
      callbacks?.onEnd?.();
    }
  };

  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);

  event.stopPropagation();
  event.preventDefault();
}
