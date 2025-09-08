import { Injectable, WritableSignal, signal } from '@angular/core';
import type { Zone, Crag, Topo, Route, TopoRoute, Parking } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Entity state (in-memory). Real API wiring will replace direct mutations.
  readonly zones: WritableSignal<Zone[]> = signal([]);
  readonly crags: WritableSignal<Crag[]> = signal([]);
  readonly parkings: WritableSignal<Parking[]> = signal([]);
  readonly topos: WritableSignal<Topo[]> = signal([]);
  readonly routes: WritableSignal<Route[]> = signal([]);
  readonly topoRoutes: WritableSignal<TopoRoute[]> = signal([]);

  readonly loaded = signal(true);
  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);

  // ---- CRUD helpers ----
  // Zones
  addZone(zone: Zone): void {
    this.zones.set([...this.zones(), zone]);
  }
  updateZone(id: string, patch: Partial<Zone>): void {
    this.zones.set(
      this.zones().map((z) => (z.id === id ? { ...z, ...patch } : z)),
    );
  }
  deleteZone(id: string): void {
    this.zones.set(this.zones().filter((z) => z.id !== id));
    // Also cascade: remove crags in that zone
    const cragIds = new Set(
      this.crags()
        .filter((c) => c.zoneId === id)
        .map((c) => c.id),
    );
    if (cragIds.size) {
      this.deleteCrags(Array.from(cragIds));
    }
  }

  // Crags
  addCrag(crag: Crag): void {
    this.crags.set([...this.crags(), crag]);
    // also reflect in zone.cragIds
    this.zones.set(
      this.zones().map((z) =>
        z.id === crag.zoneId
          ? {
              ...z,
              cragIds: Array.from(new Set([...(z.cragIds ?? []), crag.id])),
            }
          : z,
      ),
    );
  }
  updateCrag(id: string, patch: Partial<Crag>): void {
    this.crags.set(
      this.crags().map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }
  deleteCrag(id: string): void {
    this.crags.set(this.crags().filter((c) => c.id !== id));
    // remove from zone.cragIds
    this.zones.set(
      this.zones().map((z) => ({
        ...z,
        cragIds: (z.cragIds ?? []).filter((cid) => cid !== id),
      })),
    );
    // cascade topos, parkings
    const topoIds = new Set(
      this.topos()
        .filter((t) => t.cragId === id)
        .map((t) => t.id),
    );
    if (topoIds.size) this.deleteTopos(Array.from(topoIds));
    this.parkings.set(this.parkings().filter((p) => p.cragId !== id));
  }
  deleteCrags(ids: string[]): void {
    ids.forEach((id) => this.deleteCrag(id));
  }

  // Parkings
  addParking(parking: Parking): void {
    this.parkings.set([...this.parkings(), parking]);
  }
  updateParking(id: string, patch: Partial<Parking>): void {
    this.parkings.set(
      this.parkings().map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }
  deleteParking(id: string): void {
    this.parkings.set(this.parkings().filter((p) => p.id !== id));
  }

  // Topos
  addTopo(topo: Topo): void {
    this.topos.set([...this.topos(), topo]);
  }
  updateTopo(id: string, patch: Partial<Topo>): void {
    this.topos.set(
      this.topos().map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }
  deleteTopo(id: string): void {
    this.topos.set(this.topos().filter((t) => t.id !== id));
    // cascade topoRoutes
    const trIds = new Set(
      this.topoRoutes()
        .filter((tr) => tr.topoId === id)
        .map((tr) => tr.id),
    );
    if (trIds.size) this.deleteTopoRoutes(Array.from(trIds));
  }
  deleteTopos(ids: string[]): void {
    ids.forEach((id) => this.deleteTopo(id));
  }

  // Routes
  addRoute(route: Route): void {
    this.routes.set([...this.routes(), route]);
  }
  updateRoute(id: string, patch: Partial<Route>): void {
    this.routes.set(
      this.routes().map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }
  deleteRoute(id: string): void {
    this.routes.set(this.routes().filter((r) => r.id !== id));
    // Also remove linked topoRoutes
    const trIds = this.topoRoutes()
      .filter((tr) => tr.routeId === id)
      .map((tr) => tr.id);
    if (trIds.length) this.deleteTopoRoutes(trIds);
  }

  // TopoRoutes
  addTopoRoute(tr: TopoRoute): void {
    this.topoRoutes.set([...this.topoRoutes(), tr]);
    // reflect in topo.topoRouteIds
    this.topos.set(
      this.topos().map((t) =>
        t.id === tr.topoId
          ? {
              ...t,
              topoRouteIds: Array.from(
                new Set([...(t.topoRouteIds ?? []), tr.id]),
              ),
            }
          : t,
      ),
    );
  }
  updateTopoRoute(id: string, patch: Partial<TopoRoute>): void {
    this.topoRoutes.set(
      this.topoRoutes().map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  }
  deleteTopoRoute(id: string): void {
    this.topoRoutes.set(this.topoRoutes().filter((x) => x.id !== id));
    this.topos.set(
      this.topos().map((t) => ({
        ...t,
        topoRouteIds: (t.topoRouteIds ?? []).filter((x) => x !== id),
      })),
    );
  }
  deleteTopoRoutes(ids: string[]): void {
    ids.forEach((id) => this.deleteTopoRoute(id));
  }
}
