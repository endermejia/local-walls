import { Injectable, WritableSignal, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Zone, Crag, Topo, Route, TopoRoute, Parking } from '../models';
import { LocalStorage } from './local-storage';

export interface MockData {
  zones: Zone[];
  crags: Crag[];
  parkings: Parking[];
  topos: Topo[];
  routes: Route[];
  topoRoutes: TopoRoute[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storage = inject(LocalStorage);

  private readonly storageKey = 'mock-data';

  // Entity state
  readonly zones: WritableSignal<Zone[]> = signal([]);
  readonly crags: WritableSignal<Crag[]> = signal([]);
  readonly parkings: WritableSignal<Parking[]> = signal([]);
  readonly topos: WritableSignal<Topo[]> = signal([]);
  readonly routes: WritableSignal<Route[]> = signal([]);
  readonly topoRoutes: WritableSignal<TopoRoute[]> = signal([]);

  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);

  // Composite snapshot
  readonly data = computed<MockData>(() => ({
    zones: this.zones(),
    crags: this.crags(),
    parkings: this.parkings(),
    topos: this.topos(),
    routes: this.routes(),
    topoRoutes: this.topoRoutes(),
  }));

  constructor() {
    // Auto-load on browser (after hydration)
    if (this.isBrowser) {
      // Try local storage first
      const cached = this.storage.getItem(this.storageKey);
      if (cached) {
        try {
          const parsed: MockData = JSON.parse(cached);
          this.applyAll(parsed);
          this.loaded.set(true);
        } catch {
          // ignore and fetch fresh
        }
      }
      if (!this.loaded()) {
        // fire and forget
        this.loadAll();
      }
    }
  }

  async loadAll(): Promise<void> {
    if (!this.isBrowser) return; // avoid SSR fetch
    try {
      this.loading.set(true);
      this.error.set(null);
      const res = await fetch('/mock/mock.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load mock data');
      const data = (await res.json()) as MockData;
      this.applyAll(data);
      // persist in browser to avoid refetch
      this.storage.setItem(this.storageKey, JSON.stringify(data));
      this.loaded.set(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  private applyAll(data: MockData): void {
    // Zones and other entities as-is
    this.zones.set(data.zones ?? []);

    // Ensure all crag locations are distinct (some mock datasets may repeat coords)
    const incomingCrags = (data.crags ?? []).map(c => ({ ...c }));
    const seen = new Set<string>();
    for (const c of incomingCrags) {
      if (!c.ubication) continue;
      let { lat, lng } = c.ubication;
      let key = `${lat},${lng}`;
      let n = 0;
      // Nudge coordinates slightly until unique
      while (seen.has(key)) {
        n++;
        lat = +(lat + 0.0001 * n).toFixed(6);
        lng = +(lng + 0.0001 * n).toFixed(6);
        key = `${lat},${lng}`;
      }
      c.ubication = { lat, lng };
      seen.add(key);
    }
    this.crags.set(incomingCrags);

    this.parkings.set(data.parkings ?? []);
    this.topos.set(data.topos ?? []);
    this.routes.set(data.routes ?? []);
    this.topoRoutes.set(data.topoRoutes ?? []);
  }

  private persist(): void {
    if (this.isBrowser) {
      const snapshot = this.data();
      this.storage.setItem(this.storageKey, JSON.stringify(snapshot));
    }
  }

  // ---- CRUD helpers ----
  // Zones
  addZone(zone: Zone): void {
    this.zones.set([...this.zones(), zone]);
    this.persist();
  }
  updateZone(id: string, patch: Partial<Zone>): void {
    this.zones.set(this.zones().map(z => z.id === id ? { ...z, ...patch } : z));
    this.persist();
  }
  deleteZone(id: string): void {
    this.zones.set(this.zones().filter(z => z.id !== id));
    // Also cascade: remove crags in that zone
    const cragIds = new Set(this.crags().filter(c => c.zoneId === id).map(c => c.id));
    if (cragIds.size) {
      this.deleteCrags(Array.from(cragIds));
    }
    this.persist();
  }

  // Crags
  addCrag(crag: Crag): void {
    this.crags.set([...this.crags(), crag]);
    // also reflect in zone.cragIds
    this.zones.set(this.zones().map(z => z.id === crag.zoneId ? { ...z, cragIds: Array.from(new Set([...(z.cragIds ?? []), crag.id])) } : z));
    this.persist();
  }
  updateCrag(id: string, patch: Partial<Crag>): void {
    this.crags.set(this.crags().map(c => c.id === id ? { ...c, ...patch } : c));
    this.persist();
  }
  deleteCrag(id: string): void {
    this.crags.set(this.crags().filter(c => c.id !== id));
    // remove from zone.cragIds
    this.zones.set(this.zones().map(z => ({ ...z, cragIds: (z.cragIds ?? []).filter(cid => cid !== id) })));
    // cascade topos, parkings
    const topoIds = new Set(this.topos().filter(t => t.cragId === id).map(t => t.id));
    if (topoIds.size) this.deleteTopos(Array.from(topoIds));
    this.parkings.set(this.parkings().filter(p => p.cragId !== id));
    this.persist();
  }
  deleteCrags(ids: string[]): void { ids.forEach(id => this.deleteCrag(id)); }

  // Parkings
  addParking(parking: Parking): void {
    this.parkings.set([...this.parkings(), parking]);
    this.persist();
  }
  updateParking(id: string, patch: Partial<Parking>): void {
    this.parkings.set(this.parkings().map(p => p.id === id ? { ...p, ...patch } : p));
    this.persist();
  }
  deleteParking(id: string): void {
    this.parkings.set(this.parkings().filter(p => p.id !== id));
    this.persist();
  }

  // Topos
  addTopo(topo: Topo): void {
    this.topos.set([...this.topos(), topo]);
    this.persist();
  }
  updateTopo(id: string, patch: Partial<Topo>): void {
    this.topos.set(this.topos().map(t => t.id === id ? { ...t, ...patch } : t));
    this.persist();
  }
  deleteTopo(id: string): void {
    this.topos.set(this.topos().filter(t => t.id !== id));
    // cascade topoRoutes
    const trIds = new Set(this.topoRoutes().filter(tr => tr.topoId === id).map(tr => tr.id));
    if (trIds.size) this.deleteTopoRoutes(Array.from(trIds));
    this.persist();
  }
  deleteTopos(ids: string[]): void { ids.forEach(id => this.deleteTopo(id)); }

  // Routes
  addRoute(route: Route): void { this.routes.set([...this.routes(), route]); this.persist(); }
  updateRoute(id: string, patch: Partial<Route>): void {
    this.routes.set(this.routes().map(r => r.id === id ? { ...r, ...patch } : r));
    this.persist();
  }
  deleteRoute(id: string): void {
    this.routes.set(this.routes().filter(r => r.id !== id));
    // Also remove linked topoRoutes
    const trIds = this.topoRoutes().filter(tr => tr.routeId === id).map(tr => tr.id);
    if (trIds.length) this.deleteTopoRoutes(trIds);
    this.persist();
  }

  // TopoRoutes
  addTopoRoute(tr: TopoRoute): void {
    this.topoRoutes.set([...this.topoRoutes(), tr]);
    // reflect in topo.topoRouteIds
    this.topos.set(this.topos().map(t => t.id === tr.topoId ? { ...t, topoRouteIds: Array.from(new Set([...(t.topoRouteIds ?? []), tr.id])) } : t));
    this.persist();
  }
  updateTopoRoute(id: string, patch: Partial<TopoRoute>): void {
    this.topoRoutes.set(this.topoRoutes().map(x => x.id === id ? { ...x, ...patch } : x));
    this.persist();
  }
  deleteTopoRoute(id: string): void {
    this.topoRoutes.set(this.topoRoutes().filter(x => x.id !== id));
    this.topos.set(this.topos().map(t => ({ ...t, topoRouteIds: (t.topoRouteIds ?? []).filter(x => x !== id) })));
    this.persist();
  }
  deleteTopoRoutes(ids: string[]): void { ids.forEach(id => this.deleteTopoRoute(id)); }
}
