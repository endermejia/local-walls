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
   * Best-effort reset to effective 100% zoom by compensating current visualViewport scale
   * using CSS zoom. Does nothing on the server.
   */
  resetEffectiveZoom(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      typeof window === 'undefined' ||
      !this.document
    )
      return;

    try {
      const scale = (window as any).visualViewport?.scale ?? 1;
      const inverse = Number.isFinite(scale) && scale > 0 ? 1 / scale : 1;
      const html = this.document.documentElement as HTMLElement | null;
      const body = this.document.body as HTMLElement | null;

      if (html) {
        html.style.zoom = String(inverse);
        (html.style as any).WebkitTextSizeAdjust = '100%';
        html.style.setProperty('text-size-adjust', '100%');
      }
      if (body) {
        body.style.zoom = String(inverse);
      }
    } catch {
      // no-op: best effort only
    }
  }
}
