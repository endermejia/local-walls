import { inject, Injectable, signal } from '@angular/core';
import { LocalStorage } from './local-storage';

export interface VisitedCrag {
  id: number;
  name: string;
  slug: string;
  area_slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedCragsService {
  private readonly storage = inject(LocalStorage);
  private readonly STORAGE_KEY = 'visited_crags';
  private readonly MAX_CRAGS = 10;

  private readonly _visitedCrags = signal<VisitedCrag[]>(
    this.loadVisitedCrags(),
  );
  readonly visitedCrags = this._visitedCrags.asReadonly();

  private loadVisitedCrags(): VisitedCrag[] {
    const data = this.storage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  addVisitedCrag(crag: VisitedCrag) {
    const current = this.loadVisitedCrags();
    // Remove if already exists to move it to the front
    const filtered = current.filter((c) => c.id !== crag.id);
    const updated = [crag, ...filtered].slice(0, this.MAX_CRAGS);

    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this._visitedCrags.set(updated);
  }
}
