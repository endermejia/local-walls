import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { TuiAlertService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { concat, filter, first, interval, map } from 'rxjs';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

/**
 * OfflineService: SSR-safe Service Worker updates management.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly appRef = inject(ApplicationRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly alerts = inject(TuiAlertService);
  private readonly translate = inject(TranslateService);

  private readonly isBrowser =
    isPlatformBrowser(this.platformId) &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined';

  readonly updateAvailable = signal(false);

  constructor() {
    if (this.isBrowser) {
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

        // Periodically check for updates
        const appIsStable$ = this.appRef.isStable.pipe(
          first((isStable) => isStable === true),
        );
        const everySixHours$ = interval(6 * 60 * 60 * 1000);
        const everySixHoursOnceAppIsStable$ = concat(
          appIsStable$,
          everySixHours$,
        );

        everySixHoursOnceAppIsStable$.subscribe(async () => {
          try {
            await this.swUpdate.checkForUpdate();
            console.log('Checked for updates...');
          } catch (err) {
            console.error('Failed to check for updates:', err);
          }
        });
      }

      // Monitor Service Worker state
      this.monitorServiceWorkerState();
    }
  }

  private async showUpdateNotification() {
    const { UpdateNotificationComponent } = await import(
      '../components/update-notification'
    );
    this.alerts
      .open(new PolymorpheusComponent(UpdateNotificationComponent), {
        label: this.translate.instant('messages.updateAvailable'),
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
