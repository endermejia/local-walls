import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { TuiAlertService } from '@taiga-ui/core';

import { filter, map } from 'rxjs';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

/**
 * OfflineService: SSR-safe online/offline status as a Signal.
 * Uses navigator.onLine when available and listens to window online/offline events.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly alerts = inject(TuiAlertService);

  private readonly isBrowser =
    isPlatformBrowser(this.platformId) &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined';

  readonly isOnline: WritableSignal<boolean> = signal(true);
  readonly updateAvailable = signal(false);

  constructor() {
    if (this.isBrowser) {
      // Initial value from navigator
      try {
        this.isOnline.set(navigator.onLine);
      } catch {
        // fallback to true
        this.isOnline.set(true);
      }

      // Listen to online/offline events
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.showOnlineNotification();
      });

      window.addEventListener('offline', () => {
        this.isOnline.set(false);
        this.showOfflineNotification();
      });

      // Service Worker updates
      if (this.swUpdate.isEnabled) {
        this.swUpdate.versionUpdates
          .pipe(
            filter((evt) => evt.type === 'VERSION_READY'),
            map(() => true),
          )
          .subscribe(() => {
            this.updateAvailable.set(true);
            this.showUpdateNotification();
          });
      }

      // Monitor Service Worker state
      this.monitorServiceWorkerState();
    }
  }

  private showOfflineNotification() {
    this.alerts
      .open('Estás sin conexión. Usa el contenido en caché.', {
        label: 'Sin conexión',
        appearance: 'warning',
        autoClose: 5000,
      })
      .subscribe();
  }

  private showOnlineNotification() {
    this.alerts
      .open('Conexión restaurada', {
        label: 'Conectado',
        appearance: 'success',
        autoClose: 3000,
      })
      .subscribe();
  }

  private async showUpdateNotification() {
    const { UpdateNotificationComponent } = await import(
      '../components/update-notification'
    );
    this.alerts
      .open(new PolymorpheusComponent(UpdateNotificationComponent), {
        label: 'messages.updateAvailable',
        autoClose: 0,
        appearance: 'warning',
      })
      .subscribe();
  }

  async applyUpdate() {
    if (this.updateAvailable()) {
      await this.swUpdate.activateUpdate();
      if (this.isBrowser) {
        window.location.reload();
      }
    }
  }

  private monitorServiceWorkerState() {
    if (!this.isBrowser || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready
      .then((registration) => {
        console.log('Service Worker ready:', registration);

        // Listen for controlling SW changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed');
        });
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }
}
