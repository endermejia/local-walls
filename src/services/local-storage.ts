import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorage {
  private readonly isBrowser: boolean;
  private readonly storage: Storage | null = null;
  private readonly memoryStorage = new Map<string, string>();

  get isAvailable(): boolean {
    return this.storage !== null;
  }

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let storage: Storage | null = null;

    if (this.isBrowser && typeof window !== 'undefined') {
      try {
        // Explicitly check for window.localStorage access as it may throw in some contexts
        // We use a temporary variable and test it before assigning to this.storage
        const win = window as any;
        if (win && win.localStorage) {
          const s = win.localStorage;
          const testKey = '__storage_test__';
          s.setItem(testKey, testKey);
          s.removeItem(testKey);
          storage = s;
        }
      } catch (e) {
        // Access to localStorage is denied
        storage = null;
      }
    }

    this.storage = storage;
  }

  /**
   * Gets an item from localStorage (browser) or memory storage (server/restricted)
   * @param key The key to get
   * @returns The value or null if not found
   */
  getItem(key: string): string | null {
    if (this.storage) {
      try {
        return this.storage.getItem(key);
      } catch (e) {
        // Fallback to memory if it fails at runtime
      }
    }
    return this.memoryStorage.get(key) || null;
  }

  /**
   * Sets an item in localStorage (browser) or memory storage (server/restricted)
   * @param key The key to set
   * @param value The value to set
   */
  setItem(key: string, value: string): void {
    if (this.storage) {
      try {
        this.storage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory if it fails at runtime
      }
    }
    this.memoryStorage.set(key, value);
  }

  /**
   * Removes an item from localStorage (browser) or memory storage (server/restricted)
   * @param key The key to remove
   */
  removeItem(key: string): void {
    if (this.storage) {
      try {
        this.storage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory if it fails at runtime
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Clears all items from localStorage (browser) or memory storage (server/restricted)
   */
  clear(): void {
    if (this.storage) {
      try {
        this.storage.clear();
        return;
      } catch (e) {
        // Fallback to memory if it fails at runtime
      }
    }
    this.memoryStorage.clear();
  }
}
