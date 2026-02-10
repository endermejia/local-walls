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
