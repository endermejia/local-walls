/**
 * Utility to trigger a smooth theme transition using the View Transitions API.
 * It creates a circular reveal effect starting from the user's click position.
 */
export async function triggerThemeTransition(
  event: MouseEvent | undefined,
  update: () => void | Promise<void>,
): Promise<void> {
  // Fallback for browsers that don't support View Transitions API
  // @ts-ignore
  if (!document.startViewTransition) {
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

  // @ts-ignore
  const transition = document.startViewTransition(async () => {
    await update();
  });

  try {
    await transition.finished;
  } finally {
    // Cleanup
    document.documentElement.classList.remove('theme-transitioning');
  }
}
