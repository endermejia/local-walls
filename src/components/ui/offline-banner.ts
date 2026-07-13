import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (isOffline()) {
      <div
        class="fixed top-0 left-0 right-0 z-9999 bg-amber-500 text-white text-center py-2 text-sm font-medium shadow-md flex items-center justify-center gap-2"
        role="alert"
      >
        <span>{{ 'offline.banner' | translate }}</span>
        <button
          type="button"
          class="ml-2 text-white/80 hover:text-white cursor-pointer"
          (click)="dismiss()"
          [attr.aria-label]="'close' | translate"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineBannerComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isOffline = signal(false);

  dismiss(): void {
    this.isOffline.set(false);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isOffline.set(!navigator.onLine);

    const onlineHandler = () => this.isOffline.set(false);
    const offlineHandler = () => this.isOffline.set(true);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  }
}
