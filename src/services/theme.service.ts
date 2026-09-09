import { DOCUMENT } from '@angular/common';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { Theme, Themes } from '../models';

import { triggerThemeTransition } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

/**
 * Manages theme state and transitions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly supabase = inject(SupabaseService);
  private readonly localStorage = inject(LocalStorage);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly destroyRef = inject(DestroyRef);

  readonly themeStorageKey = 'app_theme';

  private readonly systemPrefersDark = signal(
    this.isBrowser &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  readonly theme: WritableSignal<Theme> = signal<Theme>(
    (() => {
      if (this.isBrowser) {
        try {
          const raw = this.localStorage.getItem(this.themeStorageKey);
          if (raw === Themes.DARK || raw === Themes.LIGHT || raw === 'system') {
            return raw as Theme;
          }
        } catch {
          // Silent fail
        }
      }
      return Themes.LIGHT;
    })(),
  );
  readonly selectedTheme = this.theme.asReadonly();

  readonly isDark = computed(() => {
    const t = this.theme();
    if (t === Themes.DARK) return true;
    if (t === Themes.LIGHT) return false;
    return this.systemPrefersDark();
  });

  constructor() {
    if (
      this.isBrowser &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        this.systemPrefersDark.set(e.matches);
      };
      media.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => {
        media.removeEventListener('change', listener);
      });
    }
  }

  // Persist theme changes to localStorage
  protected readonly _persistThemeEffect = effect(() => {
    const current = this.theme();
    if (this.isBrowser) {
      this.localStorage.setItem(this.themeStorageKey, current);
    }
  });

  // Sync theme from userProfile when profile loads/updates
  protected readonly _syncProfileThemeEffect = effect(() => {
    const profile = this.supabase.userProfile();
    if (profile?.theme) {
      this.theme.set(profile.theme as Theme);
    }
  });

  // Apply theme attributes, meta tags, and color-scheme to the DOM
  protected readonly _applyThemeEffect = effect(() => {
    const dark = this.isDark();
    if (!this.isBrowser) return;

    const color = dark ? '#0b1220' : '#ffffff';

    // 1. Root & body styling and attributes
    const docEl = this.doc.documentElement;
    docEl.setAttribute('tuiTheme', dark ? 'dark' : 'light');
    docEl.style.setProperty('--tui-theme-color', color);
    docEl.style.backgroundColor = color;
    if (this.doc.body) {
      this.doc.body.style.backgroundColor = color;
    }
    docEl.classList.toggle('dark', dark);
    docEl.classList.toggle('light', !dark);

    // 2. Mobile OS status bar: always maintain dark theme (#0b1220) with white icons ('black' / 'dark')
    // so icons are consistently visible and never disappear on Android WebAPK or iOS PWA
    this.updateThemeColor('#0b1220');
    this.updateMetaTag('apple-mobile-web-app-status-bar-style', 'black');
    this.updateMetaTag('color-scheme', 'dark');
  });

  private updateThemeColor(color: string): void {
    const metas = Array.from(
      this.doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
    let meta = metas[0];
    for (let i = 1; i < metas.length; i++) {
      metas[i].remove();
    }
    if (!meta) {
      meta = this.doc.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      this.doc.head.appendChild(meta);
    }
    meta.removeAttribute('media');
    meta.setAttribute('content', color);

    const parent = meta.parentNode;
    if (parent) {
      parent.removeChild(meta);
      parent.appendChild(meta);
    }
  }

  private updateMetaTag(name: string, content: string): void {
    let meta = this.doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) {
      meta = this.doc.createElement('meta');
      meta.setAttribute('name', name);
      this.doc.head.appendChild(meta);
    }
    meta.setAttribute('content', content);

    // Re-inserting the element forces WebKit and Chromium browsers (e.g. Chrome on Android,
    // Safari on iOS, PWA standalone windows) to observe the change and repaint the status bar.
    const parent = meta.parentNode;
    if (parent) {
      parent.removeChild(meta);
      parent.appendChild(meta);
    }
  }

  setTheme(newTheme: Theme, event?: MouseEvent): void {
    if (this.theme() === newTheme) return;
    void triggerThemeTransition(event, () => {
      this.theme.set(newTheme);
    });
  }

  syncFromProfile(): void {
    const profile = this.supabase.userProfile();
    if (!profile) return;

    if (profile.theme) {
      this.theme.set(profile.theme as Theme);
    }
  }
}
