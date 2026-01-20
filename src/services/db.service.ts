import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private readonly dbName = 'local_walls_db';
  private readonly dbVersion = 1;

  async get<T>(storeName: string, id: string | number): Promise<T | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async putAll<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      items.forEach((item) => store.put(item));
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('areas')) {
          db.createObjectStore('areas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('crags')) {
          db.createObjectStore('crags', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('crag_details')) {
          db.createObjectStore('crag_details', { keyPath: 'slug' });
        }
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('crag_routes')) {
          // Stores routes list for a specific crag
          db.createObjectStore('crag_routes', { keyPath: 'cragId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
