import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * SSR-safe utilities for viewport and document manipulation.
 * Encapsulates all direct access to window/document.
 */
@Injectable({ providedIn: 'root' })
export class BrowserViewportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document: Document | null = inject(DOCUMENT, {
    optional: true,
  }) as Document | null;

  /**
   * Resets zoom to effective 100% for both mobile and desktop devices.
   * Equivalent to pressing Ctrl+0 in browsers.
   * Does nothing on the server.
   */
  resetEffectiveZoom(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      typeof window === 'undefined' ||
      !this.document
    )
      return;

    try {
      const html = this.document.documentElement as HTMLElement | null;
      const body = this.document.body as HTMLElement | null;

      // Establecer zoom al 100% para cualquier dispositivo
      if (html) {
        html.style.zoom = '1';
        (html.style as any).WebkitTextSizeAdjust = '100%';
        html.style.setProperty('text-size-adjust', '100%');
      }
      if (body) {
        body.style.zoom = '1';
      }
    } catch {
      // no-op: best effort only
    }
  }
}
