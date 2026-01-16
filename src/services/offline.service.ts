import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

/**
 * OfflineService: SSR-safe online/offline status as a Signal.
 * Uses navigator.onLine when available and listens to window online/offline events.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser =
    isPlatformBrowser(this.platformId) &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined';

  private readonly onlineSig: WritableSignal<boolean> = signal(true);

  readonly isOnline: Signal<boolean> = this.onlineSig.asReadonly();

  constructor() {
    if (this.isBrowser) {
      // Initial value from navigator
      try {
        this.onlineSig.set(navigator.onLine);
      } catch {
        // fallback to true
        this.onlineSig.set(true);
      }
      // Listen to online/offline events
      window.addEventListener('online', () => this.onlineSig.set(true));
      window.addEventListener('offline', () => this.onlineSig.set(false));
    }
  }
}
