import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

import { TuiAlertService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { filter, first } from 'rxjs';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

/**
 * OfflineService: Manages Service Worker updates and offline state.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly appRef = inject(ApplicationRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly alerts = inject(TuiAlertService);
  private readonly translate = inject(TranslateService);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly updateAvailable = signal(false);
  readonly isOnline = signal(true);

  constructor() {
    if (!this.isBrowser) return;

    this.isOnline.set(navigator.onLine);
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));

    if (!this.swUpdate.isEnabled) return;

    // 1. Listen for new versions
    this.swUpdate.versionUpdates
      .pipe(
        filter(
          (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
        ),
      )
      .subscribe(() => {
        this.updateAvailable.set(true);
        void this.showUpdateNotification();
      });

    // 2. Handle unrecoverable state
    this.swUpdate.unrecoverable.subscribe((evt) => {
      console.error('Unrecoverable version detected:', evt.reason);
      window.location.reload();
    });

    // 3. Periodically check for updates (e.g., every hour)
    this.appRef.isStable
      .pipe(first((stable) => stable))
      .subscribe(() => {
        // Initial check
        void this.swUpdate.checkForUpdate();

        // Interval check (every hour)
        setInterval(() => {
          void this.swUpdate.checkForUpdate();
        }, 60 * 60 * 1000);
      });
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
      const activated = await this.swUpdate.activateUpdate();
      if (activated) {
        window.location.reload();
      }
    }
  }
}
