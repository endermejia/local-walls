/**
 * Utility to trigger a smooth theme transition using the View Transitions API.
 * It creates a circular reveal effect starting from the user's click position.
 */

interface ThemeTransition {
  finished: Promise<void>;
}

interface ThemeTransitionDocument {
  startViewTransition(callback: () => Promise<void> | void): ThemeTransition;
}

export async function triggerThemeTransition(
  event: MouseEvent | undefined,
  update: () => void | Promise<void>,
): Promise<void> {
  // Fallback for browsers that don't support View Transitions API
  if (!('startViewTransition' in document)) {
    await update();
    return;
  }

  // Get the click position or fallback to the center of the screen
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  // Set CSS variables for the animation
  document.documentElement.style.setProperty('--x', `${x}px`);
  document.documentElement.style.setProperty('--y', `${y}px`);
  document.documentElement.classList.add('theme-transitioning');

  const transition = (
    document as unknown as ThemeTransitionDocument
  ).startViewTransition(async () => {
    await update();
  });

  try {
    await transition.finished;
  } finally {
    // Cleanup
    document.documentElement.classList.remove('theme-transitioning');
  }
}
