import { ResourceRef } from '@angular/core';

/**
 * Polls an Angular resource until its value is not undefined (i.e., it has finished loading).
 * @param resource The resource to poll.
 * @param maxAttempts Maximum number of polling attempts.
 * @param interval Interval between attempts in milliseconds.
 * @returns The resource value if loaded, or undefined if timeout is reached.
 */
export async function waitForResource<T>(
  resource: ResourceRef<T>,
  maxAttempts = 60,
  interval = 50,
): Promise<T | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    const val = resource.value();
    if (val !== undefined) {
      return val;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return undefined;
}
