import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorage {
  private readonly isBrowser: boolean;
  private readonly isAvailable: boolean;
  private readonly memoryStorage = new Map<string, string>();

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let available = false;

    if (this.isBrowser) {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        available = true;
      } catch (e) {
        available = false;
      }
    }

    this.isAvailable = available;
  }

  /**
   * Gets an item from localStorage (browser) or memory storage (server/restricted)
   * @param key The key to get
   * @returns The value or null if not found
   */
  getItem(key: string): string | null {
    if (this.isAvailable) {
      try {
        return localStorage.getItem(key);
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
    if (this.isAvailable) {
      try {
        localStorage.setItem(key, value);
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
    if (this.isAvailable) {
      try {
        localStorage.removeItem(key);
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
    if (this.isAvailable) {
      try {
        localStorage.clear();
        return;
      } catch (e) {
        // Fallback to memory if it fails at runtime
      }
    }
    this.memoryStorage.clear();
  }
}
