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
      // Restablecer el zoom nativo del navegador al 100%
      if (typeof window.document.body.style.zoom !== 'undefined') {
        // Para navegadores que soportan zoom en CSS (Chrome, Safari)
        window.document.body.style.zoom = '100%';
        window.document.documentElement.style.zoom = '100%';
      } else {
        // Para otros navegadores usar transform estándar
        window.document.body.style.transform = 'scale(1)';
        window.document.body.style.transformOrigin = '0 0';
        window.document.documentElement.style.transform = 'scale(1)';
        window.document.documentElement.style.transformOrigin = '0 0';
      }

      // Restaurar también la configuración de viewport para dispositivos móviles
      let viewportMeta = this.document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = this.document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        this.document.head.appendChild(viewportMeta);
      }

      // Restaurar la escala inicial sin restricciones
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, user-scalable=yes',
      );

      // Forzar el refresco del navegador para aplicar los cambios
      if (window.scrollTo) {
        window.scrollTo(0, 0);
      }
    } catch {
      // no-op: best effort only
    }
  }
}
