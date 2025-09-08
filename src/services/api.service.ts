import {
  Injectable,
  WritableSignal,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MapBounds, VerticalLifeApi } from './vertical-life-api';
import type { Zone, Crag, Topo, Route, TopoRoute, Parking } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly verticalLifeApi = inject(VerticalLifeApi);
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

  // Topos
  addTopo(topo: Topo): void {
    this.topos.set([...this.topos(), topo]);
  }

  // Routes
  addRoute(route: Route): void {
    this.routes.set([...this.routes(), route]);
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

  // ---- Remote loading (8a.nu) ----
  async loadZonesAndCragsFromBounds(bounds: MapBounds): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const locations = await this.verticalLifeApi.getMapLocations(bounds);
      const zonesIndex = new Map(this.zones().map((z) => [z.id, z] as const));
      const cragsIndex = new Map(this.crags().map((c) => [c.id, c] as const));

      for (const loc of locations) {
        const zoneId = String(loc.id);
        // Upsert zone with optional metadata
        if (!zonesIndex.has(zoneId)) {
          const z: Zone = {
            id: zoneId,
            name: loc.name,
            cragIds: [],
            slug: loc.slug,
            countrySlug: loc.country_slug,
          };
          this.addZone(z);
          zonesIndex.set(zoneId, z);
        }
        // Create a crag per location using slug as stable id
        const cragId = loc.slug;
        if (!cragsIndex.has(cragId)) {
          const c: Crag = {
            id: cragId,
            name: loc.name,
            location: { lat: loc.latitude, lng: loc.longitude },
            parkings: [],
            zoneId,
          };
          this.addCrag(c);
          cragsIndex.set(cragId, c);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadZoneById(zoneId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    // If already present, nothing to do
    if (this.zones().some((z) => z.id === zoneId)) return;

    try {
      this.loading.set(true);
      // World bounds with small zoom to ensure coverage; request many items
      const locations = await this.verticalLifeApi.getMapLocations({
        south_west_latitude: -90,
        south_west_longitude: -180,
        north_east_latitude: 90,
        north_east_longitude: 180,
        zoom: 5,
        page_index: 0,
        page_size: 20,
      });
      const target = locations.find((l) => String(l.id) === String(zoneId));
      if (!target) return; // Not found; keep silent for now

      // Upsert zone
      const z: Zone = {
        id: String(target.id),
        name: target.name,
        cragIds: [],
        slug: target.slug,
        countrySlug: target.country_slug,
      };
      if (!this.zones().some((x) => x.id === z.id)) {
        this.addZone(z);
      }

      // Upsert related crag for this map location
      const cragId = target.slug;
      if (!this.crags().some((c) => c.id === cragId)) {
        const c: Crag = {
          id: cragId,
          name: target.name,
          location: { lat: target.latitude, lng: target.longitude },
          parkings: [],
          zoneId: z.id,
        };
        this.addCrag(c);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCragRoutes(cragId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    const crag = this.crags().find((c) => c.id === cragId);
    if (!crag) return;
    const zone = this.zones().find((z) => z.id === crag.zoneId);
    const country = zone?.countrySlug || 'spain';
    const cragSlug = crag.id; // we used slug as id

    try {
      this.loading.set(true);
      const res = await this.verticalLifeApi.getRoutesByCrag(
        country,
        cragSlug,
        {
          pageIndex: 0,
          sortField: 'totalascents',
          order: 'desc',
        },
      );

      // Ensure a default topo exists for this crag
      let topo = this.topos().find((t) => t.cragId === cragId);
      if (!topo) {
        topo = {
          id: `topo-${cragId}`,
          name: `${crag.name}`,
          cragId,
          topoRouteIds: [],
        };
        this.addTopo(topo);
      }

      const routeIndex = new Map(this.routes().map((r) => [r.id, r] as const));
      let nextNumber =
        this.topoRoutes().filter((tr) => tr.topoId === topo!.id).length + 1;

      for (const item of res.items ?? []) {
        const routeId = String(item.zlaggableId);
        if (!routeIndex.has(routeId)) {
          const r: Route = {
            id: routeId,
            name: item.zlaggableName,
            grade: item.difficulty,
            url_8anu: undefined,
          };
          this.addRoute(r);
          routeIndex.set(routeId, r);
        }
        // Link in topo if not already linked
        const already = this.topoRoutes().some(
          (x) => x.topoId === topo!.id && x.routeId === routeId,
        );
        if (!already) {
          this.addTopoRoute({
            id: `${topo!.id}-${routeId}`,
            number: nextNumber++,
            routeId,
            topoId: topo!.id,
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
