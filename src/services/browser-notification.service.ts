import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private readonly platformId = inject(PLATFORM_ID);
  private audioContext: AudioContext | null = null;
  private originalTitle: string | null = null;
  private titleInterval: ReturnType<typeof setInterval> | null = null;

  async requestPermission(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Initialize audio context on user interaction (this method is called on click)
    this.initAudioContext();

    if (!('Notification' in window)) return;

    if (
      Notification.permission === 'default' ||
      Notification.permission === 'denied'
    ) {
      try {
        const permission = await Notification.requestPermission();
        console.log(
          '[BrowserNotificationService] Permission result:',
          permission,
        );
      } catch (err) {
        console.error(
          '[BrowserNotificationService] requestPermission error',
          err,
        );
      }
    }
  }

  show(title: string, options?: NotificationOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!('Notification' in window)) {
      console.warn('[BrowserNotificationService] Notifications not supported');
      return;
    }

    // Try to recover/resume audio context if it exists
    // Try to recover/resume audio context if it exists
    if (this.audioContext && this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    if (Notification.permission === 'granted') {
      try {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          n.close();
          this.stopTitleFlash();
        };
      } catch (e) {
        console.error('[BrowserNotificationService] show error', e);
      }
    } else {
      console.warn(
        '[BrowserNotificationService] Permission not granted:',
        Notification.permission,
      );
    }
  }

  /**
   * Sets up global listeners to resume AudioContext on interaction.
   * Keeps listening until the context is actually 'running'.
   */
  bindUserGesture(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const events = ['click', 'touchstart', 'keydown'];

    const unlockHandler = () => {
      // Ensure context exists
      this.initAudioContext();
      const ctx = this.audioContext;

      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => {
            console.log(
              '[BrowserNotificationService] AudioContext resumed, state:',
              ctx.state,
            );
            if (ctx.state === 'running') {
              events.forEach((e) =>
                window.removeEventListener(e, unlockHandler, true),
              );
            }
          })
          .catch((err) =>
            console.error('[BrowserNotificationService] Resume failed', err),
          );
      } else if (ctx.state === 'running') {
        // Already running, no need to listen anymore
        events.forEach((e) =>
          window.removeEventListener(e, unlockHandler, true),
        );
      }
    };

    events.forEach((event) =>
      window.addEventListener(event, unlockHandler, { capture: true }),
    );
  }

  playSound(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // If context doesn't exist yet, try to create it (might start suspended)
    this.initAudioContext();
    const ctx = this.audioContext;

    if (!ctx) return;

    // If still suspended, try resuming (will only work if we are currently in a user action chain,
    // which is unlikely for async notifications, but worth a try).
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (ctx.state !== 'running') {
      console.warn(
        '[BrowserNotificationService] Cannot play sound, AudioContext is',
        ctx.state,
      );
      return;
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      // "Ding" sound
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('[BrowserNotificationService] playSound error', e);
    }
  }

  flashTitle(message: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.titleInterval) return; // Already flashing

    this.originalTitle = document.title;
    let showMessage = true;

    this.titleInterval = setInterval(() => {
      document.title = showMessage
        ? message
        : this.originalTitle || 'ClimBeast';
      showMessage = !showMessage;
    }, 1000);

    // Stop flashing on window focus
    const stopHandler = () => {
      this.stopTitleFlash();
      window.removeEventListener('focus', stopHandler);
      window.removeEventListener('click', stopHandler);
    };
    window.addEventListener('focus', stopHandler);
    window.addEventListener('click', stopHandler);
  }

  stopTitleFlash(): void {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      if (this.originalTitle) {
        document.title = this.originalTitle;
      }
    }
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    try {
      const AudioRef =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioRef) {
        this.audioContext = new AudioRef();
      }
    } catch (e) {
      console.error('Error initializing AudioContext', e);
    }
  }
}
