import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';
import {
  MapCragItem,
  MapOptions,
  MapAreaItem,
  MapAreasData,
  MapCragsData,
  MapPolygonsData,
  MapAreaDataFeature,
  MapCragDataFeature,
  MapPolygonDataFeature,
} from '../models';

export interface MapBuilderCallbacks {
  onSelectedCragChange: (mapCragItem: MapCragItem | null) => void;
  onMapClick: () => void;
  onInteractionStart: () => void;
  onViewportChange: (v: {
    south_west_latitude: number;
    south_west_longitude: number;
    north_east_latitude: number;
    north_east_longitude: number;
    zoom: number;
  }) => void;
}

interface ClusterItem {
  latitude: number;
  longitude: number;
  name: string;
  key: string;
  markerType: 'api' | 'area' | 'crag';
  liked?: boolean;
  apiItem?: MapCragItem;
  cragFeature?: MapCragDataFeature;
  areaKeys?: string[];
}

interface ClusterGroup {
  markers: ClusterItem[];
  center: [number, number];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class MapBuilder {
  private areaLayers: import('leaflet').Layer[] = [];
  private polygonLayers: import('leaflet').Layer[] = [];
  private geoJsonLayers: import('leaflet').Layer[] = [];
  private areaGeoJsonLayer: import('leaflet').Layer | null = null;
  private cragsGeoJsonLayer: import('leaflet').Layer | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly global = inject(GlobalData);
  private map!: import('leaflet').Map;
  private initialized = false;
  private L: typeof import('leaflet') | null = null;
  private mapCragItems: readonly MapCragItem[] = [];
  private markers: import('leaflet').Marker[] = [];
  private userMarker: import('leaflet').Marker | null = null;
  private clusteringEnabled = true;
  private clusterRadius = 5; // Radio para agrupar marcadores en píxeles

  // Store initial datasets to be able to re-filter them on viewport changes
  private initialCragsData: MapCragsData | null = null;
  private initialAreasData: MapAreasData | null = null;
  private initialPolygonsData: MapPolygonsData | null = null;
  private polygonsIndexByAreaKey: Map<string, any[]> = new Map();
  private areaNameMarkers: import('leaflet').Marker[] = [];
  private areaPolygonsVisibleByKey: Map<string, import('leaflet').Layer> =
    new Map();

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  async init(
    el: HTMLElement,
    options: MapOptions,
    mapCragItem: readonly MapCragItem[],
    areaItems: readonly MapAreaItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
    initialAreasData: MapAreasData | null = null,
    initialCragsData: MapCragsData | null = null,
    initialPolygonsData: MapPolygonsData | null = null,
  ): Promise<void> {
    if (this.initialized || !this.isBrowser()) return;
    const [{ default: L }] = await Promise.all([import('leaflet')]);
    this.L = L;

    this.map = new L.Map(el, {
      center: options.center ?? [39.5, -0.5],
      zoom: options.zoom ?? 6,
      worldCopyJump: true,
    });

    new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: options.maxZoom ?? 18,
      minZoom: options.minZoom ?? 6,
    }).addTo(this.map);

    this.mapCragItems = mapCragItem;

    // Restore last saved viewport (bounds + zoom) if available
    const savedViewport = this.global.mapBounds();
    if (savedViewport) {
      try {
        const bounds = new (L as any).LatLngBounds([
          [
            savedViewport.south_west_latitude,
            savedViewport.south_west_longitude,
          ],
          [
            savedViewport.north_east_latitude,
            savedViewport.north_east_longitude,
          ],
        ]);
        this.map.fitBounds(bounds);
        // Ensure zoom matches saved value within configured min/max
        const minZ = options.minZoom ?? 6;
        const maxZ = options.maxZoom ?? 18;
        const targetZ = Math.max(minZ, Math.min(maxZ, savedViewport.zoom));
        this.map.setZoom(targetZ);
      } catch {
        // ignore malformed saved viewport
      }
    }

    // Load initial GeoJSON datasets if provided
    this.initialCragsData = initialCragsData;
    this.initialAreasData = initialAreasData;
    if (initialPolygonsData) {
      await this.loadGeoJsonPolygons(initialPolygonsData);
    }
    if (initialAreasData) {
      await this.rebuildAreaNameMarkers(initialAreasData, cb);
    }
    if (initialCragsData) {
      await this.loadGeoJsonCrags(initialCragsData, selectedMapCragItem, cb);
    }

    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);
    await this.rebuildAreas(areaItems);

    // Determine if we should attempt geolocation: only on mobile devices
    const isMobileClient = (() => {
      if (!this.isBrowser() || typeof navigator === 'undefined') return false;
      const ua = (navigator.userAgent || '').toLowerCase();
      // Simple mobile heuristic; avoids desktops where geolocation UX is worse
      return /iphone|ipad|ipod|android|mobile/.test(ua);
    })();

    try {
      if (
        isMobileClient &&
        typeof navigator !== 'undefined' &&
        'geolocation' in navigator
      ) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          this.map.setView(
            [latitude, longitude],
            Math.min(9, options.maxZoom ?? 18),
          );
          await this.goToCurrentLocation();
        });
      }
    } catch {
      // ignore and fallback below
    }

    if (!savedViewport && mapCragItem && mapCragItem.length) {
      const latLngs: [number, number][] = mapCragItem.map(
        (mapItem: MapCragItem) => [mapItem.latitude, mapItem.longitude],
      );
      const bounds = new (L as any).LatLngBounds(latLngs);
      this.map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: Math.min(9, options.maxZoom ?? 18),
      });
    }

    this.map.on('click', () => {
      cb.onSelectedCragChange(null);
      cb.onMapClick();
    });

    const collapseOnInteraction = () => cb.onInteractionStart();
    this.map.on('movestart', collapseOnInteraction);
    this.map.on('zoomstart', collapseOnInteraction);

    const emitViewport = () => {
      if (!this.map) return;
      const b = this.map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const zoom = this.map.getZoom();
      cb.onViewportChange({
        south_west_latitude: sw.lat,
        south_west_longitude: sw.lng,
        north_east_latitude: ne.lat,
        north_east_longitude: ne.lng,
        zoom,
      });
    };

    this.map.on('moveend', async () => {
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
      if (this.initialCragsData) {
        await this.loadGeoJsonCrags(
          this.initialCragsData,
          selectedMapCragItem,
          cb,
        );
      }
      if (this.initialAreasData) {
        await this.rebuildAreaNameMarkers(this.initialAreasData, cb);
      }
      emitViewport();
    });
    this.map.on('zoomend', async () => {
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
      if (this.initialCragsData) {
        await this.loadGeoJsonCrags(
          this.initialCragsData,
          selectedMapCragItem,
          cb,
        );
      }
      if (this.initialAreasData) {
        await this.rebuildAreaNameMarkers(this.initialAreasData, cb);
      }
      emitViewport();
    });

    this.initialized = true;

    if (typeof window !== 'undefined') {
      const raf = (
        window as unknown as {
          requestAnimationFrame?: (cb: FrameRequestCallback) => number;
        }
      ).requestAnimationFrame;
      if (typeof raf === 'function') {
        raf(() => {
          this.map?.invalidateSize?.();
          raf(() => {
            this.map?.invalidateSize?.();
            emitViewport();
          });
        });
      } else {
        this.map?.invalidateSize?.();
        emitViewport();
      }
    }
  }

  async updateData(
    mapCragItem: readonly MapCragItem[],
    areaItems: readonly MapAreaItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
    initialAreasData: MapAreasData | null = null,
    initialCragsData: MapCragsData | null = null,
    initialPolygonsData: MapPolygonsData | null = null,
  ): Promise<void> {
    if (!this.map) return;
    this.mapCragItems = mapCragItem;
    if (initialCragsData) this.initialCragsData = initialCragsData;
    if (initialAreasData) this.initialAreasData = initialAreasData;

    if (initialPolygonsData) {
      await this.loadGeoJsonPolygons(initialPolygonsData);
    }
    if (initialAreasData) {
      await this.rebuildAreaNameMarkers(initialAreasData, cb);
    }
    if (initialCragsData) {
      await this.loadGeoJsonCrags(initialCragsData, selectedMapCragItem, cb);
    }

    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);
    await this.rebuildAreas(areaItems);
  }

  destroy(): void {
    try {
      this.cleanMarkers();
      this.cleanAreas();
      this.cleanGeoJsonLayers();
      this.map?.remove?.();
    } catch {
      // ignore
    }
    this.initialized = false;
    this.L = null;
  }

  private cleanGeoJsonLayers(): void {
    if (!this.map || !this.L) return;
    // Remove generic geojson layers list
    this.geoJsonLayers.forEach((layer) => {
      this.map.removeLayer(layer);
    });
    this.geoJsonLayers = [];
    // Remove specific stored layers
    if (this.areaGeoJsonLayer) {
      this.map.removeLayer(this.areaGeoJsonLayer);
      this.areaGeoJsonLayer = null;
    }
    if (this.cragsGeoJsonLayer) {
      this.map.removeLayer(this.cragsGeoJsonLayer);
      this.cragsGeoJsonLayer = null;
    }
    // Remove polygon layers (tracked separately)
    this.polygonLayers.forEach((layer) => {
      this.map.removeLayer(layer);
    });
    this.polygonLayers = [];
  }

  private cleanMarkers(): void {
    if (!this.map || !this.L) return;

    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  private cleanAreas(): void {
    if (!this.map || !this.L) return;
    this.areaLayers.forEach((rect) => {
      this.map.removeLayer(rect);
    });
    this.areaLayers = [];
  }

  private async loadGeoJsonAreas(areasData: MapAreasData): Promise<void> {
    // Deprecated behavior: drawing polygons for areas. Now we render label markers instead.
    await this.rebuildAreaNameMarkers(areasData);
  }

  private async loadGeoJsonCrags(
    cragsData: MapCragsData,
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;

    // When clustering is active, skip rendering individual GeoJSON crag markers
    if (this.shouldCluster()) {
      if (this.cragsGeoJsonLayer) {
        this.map.removeLayer(this.cragsGeoJsonLayer);
        this.cragsGeoJsonLayer = null;
      }
      return;
    }

    // Remove previous crag geojson layer
    if (this.cragsGeoJsonLayer) {
      this.map.removeLayer(this.cragsGeoJsonLayer);
      this.cragsGeoJsonLayer = null;
    }

    const viewBounds = this.map.getBounds().pad(0.1);
    const normalize = (s: string) => (s ?? '').trim().toLowerCase();
    const apiNameSet = new Set(
      this.mapCragItems
        .filter((c) =>
          viewBounds.contains(new (L as any).LatLng(c.latitude, c.longitude)),
        )
        .map((c) => normalize(c.name)),
    );
    const cragsLayer = new (L as any).GeoJSON(cragsData as any, {
      className: 'geojson-crag',
      filter: (feature: MapCragDataFeature) => {
        try {
          const coords = feature?.geometry?.coordinates;
          if (!coords || coords.length < 2) return false;
          const lat = coords[1] as number;
          const lng = coords[0] as number;
          const inBounds = viewBounds.contains(new (L as any).LatLng(lat, lng));
          if (!inBounds) return false;
          const name = (feature?.properties?.name as string | undefined) ?? '';
          if (apiNameSet.has(normalize(name))) return false; // suppress duplicates by label, prefer API
          return true;
        } catch {
          return false;
        }
      },
      pointToLayer: (feature: MapCragDataFeature, latlng: any) => {
        const isSelected =
          !!selectedMapCragItem &&
          feature?.properties?.id === selectedMapCragItem.id;
        const isFavorite = !!feature?.properties?.liked;
        const icon = new (L as any).DivIcon({
          html: this.cragLabelHtml(
            feature?.properties?.name ?? '',
            isSelected,
            isFavorite,
            'crag',
          ),
          className: 'pointer-events-none',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        return new (L as any).Marker(latlng, { icon });
      },
      onEachFeature: (feature: MapCragDataFeature, layer: any) => {
        if (feature?.properties?.id) {
          layer.on('click', (e: import('leaflet').LeafletEvent) => {
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.preventDefault?.();
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.stopPropagation?.();

            const coords = feature.geometry?.coordinates;
            const cragItem: MapCragItem = {
              id: feature.properties?.id ?? 0,
              name: feature.properties?.name ?? '',
              slug: feature.properties?.slug ?? '',
              area_name: feature.properties?.area_name ?? '',
              area_slug: feature.properties?.area_slug ?? '',
              country_name: feature.properties?.country_name ?? '',
              country_slug: feature.properties?.country_slug ?? '',
              category: feature.properties?.category as number,
              avg_rating: (feature.properties?.avg_rating as number) ?? 0,
              latitude: coords ? (coords[1] as number) : 0,
              longitude: coords ? (coords[0] as number) : 0,
              grades: (feature.properties?.grades as any) ?? {},
              season: (feature.properties?.season as any) ?? [],
              total_ascendables: feature.properties?.total_ascendables as
                | number
                | undefined,
              total_ascents: feature.properties?.total_ascents as
                | number
                | undefined,
              liked: feature.properties?.liked as boolean | undefined,
            };
            if (coords && (coords as any[]).length >= 2) {
              this.centerOn(coords[1] as number, coords[0] as number, 10);
            }
            cb.onSelectedCragChange(cragItem);
          });
        }
      },
    }).addTo(this.map);

    this.geoJsonLayers.push(cragsLayer);
    this.cragsGeoJsonLayer = cragsLayer;
  }

  private async loadGeoJsonPolygons(
    polygonsData: MapPolygonsData,
  ): Promise<void> {
    // Do not draw all polygons by default. Index them to toggle on area click.
    this.initialPolygonsData = polygonsData;
    this.buildPolygonsIndex(polygonsData);
    // Clear any previously visible polygons that no longer exist in dataset
    if (this.map) {
      for (const [key, layer] of this.areaPolygonsVisibleByKey.entries()) {
        this.map.removeLayer(layer);
        this.areaPolygonsVisibleByKey.delete(key);
      }
    }
  }

  private async rebuildAreas(areas: readonly MapAreaItem[]): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;
    // Clear previous
    this.cleanAreas();

    // Helper to normalize a coordinate pair into [lat, lng]
    const toLatLng = (pair: [number, number]): [number, number] => {
      let [a, b] = pair;
      // If the first value looks like longitude (>|90|) or the second looks like latitude (>|90|), swap.
      const looksLikeLon =
        Math.abs(a) > 90 ||
        (Math.abs(a) <= 180 && Math.abs(b) <= 90 && Math.abs(a) >= Math.abs(b));
      const looksLikeLatSecond =
        Math.abs(b) <= 90 && Math.abs(a) <= 180 && Math.abs(a) > 90;
      if (
        Math.abs(a) > 90 ||
        Math.abs(b) > 180 ||
        looksLikeLatSecond ||
        looksLikeLon
      ) {
        // Swap assuming input is [lng, lat]
        [a, b] = [b, a];
      }
      return [a, b];
    };

    // Draw each area as rectangle from bounding box
    for (const area of areas) {
      const bbox = area.b_box; // Expected either [[south, west], [north, east]] or [[west, south], [east, north]]
      if (!bbox || bbox.length !== 2) continue;

      const [p1, p2] = bbox as unknown as [[number, number], [number, number]];

      const [lat1, lng1] = toLatLng(p1);
      const [lat2, lng2] = toLatLng(p2);

      // Validate ranges after normalization
      if (
        !isFinite(lat1) ||
        !isFinite(lng1) ||
        !isFinite(lat2) ||
        !isFinite(lng2)
      )
        continue;

      // Ensure south<north and west<east
      const south = Math.min(lat1, lat2);
      const north = Math.max(lat1, lat2);
      const west = Math.min(lng1, lng2);
      const east = Math.max(lng1, lng2);

      // Skip degenerate bounds
      if (south === north || west === east) continue;

      const bounds = new (L as any).LatLngBounds([
        [south, west],
        [north, east],
      ] as [number, number][]);

      const rect = new (L as any).Rectangle(bounds, {
        color: '#22c55e',
        weight: 1,
        fill: true,
        fillColor: '#22c55e',
        fillOpacity: 0.15,
        interactive: false,
      }).addTo(this.map);
      this.areaLayers.push(rect);
    }
  }

  // Build index to find polygon features by area-related keys
  private buildPolygonsIndex(polygonsData: MapPolygonsData): void {
    this.polygonsIndexByAreaKey.clear();
    const features = polygonsData?.features ?? [];
    for (const f of features) {
      const keys: string[] = [];
      const pid = f.properties?.id;
      const pslug = (f.properties?.slug as string | undefined)?.toLowerCase();
      const areaSlug = (
        f.properties?.area_slug as string | undefined
      )?.toLowerCase();
      const name = (f.properties?.name as string | undefined)?.toLowerCase();
      if (pid != null) keys.push(String(pid));
      if (pslug) keys.push(pslug);
      if (areaSlug) keys.push(areaSlug);
      if (name) keys.push(name);
      for (const k of keys) {
        const arr = this.polygonsIndexByAreaKey.get(k) ?? [];
        arr.push(f as any);
        this.polygonsIndexByAreaKey.set(k, arr);
      }
    }
  }

  // Remove existing area name markers from map
  private clearAreaNameMarkers(): void {
    if (!this.map) return;
    for (const m of this.areaNameMarkers) {
      this.map.removeLayer(m);
    }
    this.areaNameMarkers = [];
  }

  // Compute a reasonable center for area polygon feature by using bbox of coordinates
  private computeAreaCenter(
    feature: MapAreaDataFeature,
  ): [number, number] | null {
    const geom = feature?.geometry;
    if (!geom) return null;
    const addPoint = (lng: number, lat: number) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        has = true;
      }
    };
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity,
      has = false;
    if (geom.type === 'Polygon') {
      const rings = geom.coordinates as number[][][];
      for (const ring of rings) {
        for (const v of ring) addPoint(v[0] as number, v[1] as number);
      }
    } else if (geom.type === 'MultiPolygon') {
      const polys = geom.coordinates as number[][][][];
      for (const poly of polys) {
        for (const ring of poly) {
          for (const v of ring) addPoint(v[0] as number, v[1] as number);
        }
      }
    }
    if (!has) return null;
    const lat = (minLat + maxLat) / 2;
    const lng = (minLng + maxLng) / 2;
    return [lat, lng];
  }

  private getAreaKeysFromFeature(feature: MapAreaDataFeature): string[] {
    const keys: string[] = [];
    const id = feature?.properties?.id;
    const slug = (
      feature?.properties?.slug as string | undefined
    )?.toLowerCase();
    const name = (
      feature?.properties?.name as string | undefined
    )?.toLowerCase();
    if (id != null) keys.push(String(id));
    if (slug) keys.push(slug);
    if (name) keys.push(name);
    return keys;
  }

  private async rebuildAreaNameMarkers(
    areasData: MapAreasData,
    cb?: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L || !areasData) return;
    const L = this.L as any;

    // When clustering is active, we don't render separate area name markers
    if (this.shouldCluster()) {
      this.clearAreaNameMarkers();
      return;
    }

    this.clearAreaNameMarkers();
    const viewBounds = this.map.getBounds().pad(0.1);
    const normalize = (s: string) => (s ?? '').trim().toLowerCase();
    const apiNameSet = new Set(
      this.mapCragItems
        .filter((c) =>
          viewBounds.contains(new (L as any).LatLng(c.latitude, c.longitude)),
        )
        .map((c) => normalize(c.name)),
    );
    for (const feature of areasData.features ?? []) {
      const name = feature?.properties?.name ?? '';
      if (!name) continue;
      const center = this.computeAreaCenter(feature);
      if (!center) continue;
      const latlng = new L.LatLng(center[0], center[1]);
      if (!viewBounds.contains(latlng)) continue;
      const icon = new L.DivIcon({
        html: this.cragLabelHtml(name, false, false, 'area'),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = new L.Marker([center[0], center[1]], { icon }).addTo(
        this.map,
      );
      this.areaNameMarkers.push(marker);
      const areaKeys = this.getAreaKeysFromFeature(feature);
      marker.on('click', (e: import('leaflet').LeafletEvent) => {
        (
          (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.preventDefault?.();
        (
          (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.stopPropagation?.();
        this.centerOn(center[0], center[1], 10);
        this.showOrToggleAreaPolygonByKeys(areaKeys, name);
      });
      // Keyboard accessibility
      this.attachMarkerKeyboardSelection(marker, () =>
        this.showOrToggleAreaPolygonByKeys(areaKeys, name),
      );
    }
  }

  private showOrToggleAreaPolygonByKeys(keys: string[], name: string): void {
    if (!this.map || !this.L) return;
    const L = this.L as any;
    const key = keys.find((k) => !!k) ?? '';
    if (!key) return;

    // Toggle: if already visible, remove it
    const existing = this.areaPolygonsVisibleByKey.get(key);
    if (existing) {
      this.map.removeLayer(existing);
      this.areaPolygonsVisibleByKey.delete(key);
      return;
    }

    // Find polygon features by any of the keys
    let features: any[] | undefined;
    for (const k of keys) {
      const list = this.polygonsIndexByAreaKey.get(k);
      if (list && list.length) {
        features = list;
        break;
      }
    }
    if (!features || !features.length) return;

    const polygonStyle: any = {
      color: '#3b82f6',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      className: 'area-polygon',
    };

    const layer = new L.GeoJSON(
      {
        type: 'FeatureCollection',
        features: features as any,
      } as any,
      {
        style: polygonStyle,
        onEachFeature: (feature: MapPolygonDataFeature, layer: any) => {
          if (name) {
            layer.bindTooltip(name, {
              permanent: false,
              direction: 'center',
              className: 'polygon-tooltip',
            });
          }
        },
      },
    ).addTo(this.map);

    this.areaPolygonsVisibleByKey.set(key, layer);
  }

  private shouldCluster(): boolean {
    if (!this.map) return true;
    const zoom = this.map.getZoom();
    return this.clusteringEnabled && zoom < 12;
  }

  // Build a unified list of clusterable items across API crags, GeoJSON crags and area labels
  private buildVisibleClusterItems(
    apiItems: readonly MapCragItem[],
  ): ClusterItem[] {
    if (!this.map || !this.L) return [];
    const L = this.L as any;
    const bounds = this.map.getBounds().pad(0.1);
    const items: ClusterItem[] = [];
    const normalize = (s: string) => (s ?? '').trim().toLowerCase();

    // API items
    for (const c of apiItems) {
      const latlng = new L.LatLng(c.latitude, c.longitude);
      if (!bounds.contains(latlng)) continue;
      items.push({
        latitude: c.latitude,
        longitude: c.longitude,
        name: c.name,
        key: `api:${c.id ?? c.slug ?? c.name}:${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`,
        markerType: 'api',
        liked: c.liked,
        apiItem: c,
      });
    }

    // Build a set of API names to suppress duplicates from other sources
    const apiNameSet = new Set(
      items.filter((i) => i.markerType === 'api').map((i) => normalize(i.name)),
    );

    // GeoJSON crags (points only)
    const cragsData = this.initialCragsData;
    if (cragsData?.features?.length) {
      for (const feature of cragsData.features as any[]) {
        try {
          const coords = feature?.geometry?.coordinates as number[] | undefined;
          if (!coords || coords.length < 2) continue;
          const lat = coords[1] as number;
          const lng = coords[0] as number;
          const latlng = new L.LatLng(lat, lng);
          if (!bounds.contains(latlng)) continue;
          const name = feature?.properties?.name ?? '';
          if (apiNameSet.has(normalize(name))) continue; // suppress duplicates by label, prefer API
          const id = feature?.properties?.id ?? '';
          items.push({
            latitude: lat,
            longitude: lng,
            name,
            key: `crag:${id || name}:${lat.toFixed(5)},${lng.toFixed(5)}`,
            markerType: 'crag',
            liked: !!feature?.properties?.liked,
            cragFeature: feature,
          });
        } catch {
          // ignore invalid features
        }
      }
    }

    // Area labels (computed centers)
    const areasData = this.initialAreasData;
    if (areasData?.features?.length) {
      for (const feature of areasData.features as any[]) {
        const name = feature?.properties?.name ?? '';
        if (!name) continue;
        if (apiNameSet.has(normalize(name))) continue; // suppress duplicates by label, prefer API
        const center = this.computeAreaCenter(feature);
        if (!center) continue;
        const latlng = new L.LatLng(center[0], center[1]);
        if (!bounds.contains(latlng)) continue;
        const keys = this.getAreaKeysFromFeature(feature);
        const idKey = keys[0] ?? name;
        items.push({
          latitude: center[0],
          longitude: center[1],
          name,
          key: `area:${idKey}:${center[0].toFixed(5)},${center[1].toFixed(5)}`,
          markerType: 'area',
          areaKeys: keys,
        });
      }
    }

    return items;
  }

  private groupMarkersByProximity(
    items: readonly ClusterItem[],
  ): ClusterGroup[] {
    if (!this.map || !this.L) return [];
    const L = this.L as any;

    if (!this.shouldCluster()) {
      return items.map((it) => ({
        markers: [it],
        center: [it.latitude, it.longitude],
        count: 1,
      }));
    }

    const groups: ClusterGroup[] = [];
    const processed = new Set<string>();

    for (const it of items) {
      if (processed.has(it.key)) continue;

      const latlng = new L.LatLng(it.latitude, it.longitude);
      const point = this.map.latLngToContainerPoint(latlng);

      const group: ClusterGroup = {
        markers: [it],
        center: [it.latitude, it.longitude],
        count: 1,
      };

      processed.add(it.key);

      for (const other of items) {
        if (other.key === it.key || processed.has(other.key)) continue;

        const otherLatLng = new L.LatLng(other.latitude, other.longitude);
        const otherPoint = this.map.latLngToContainerPoint(otherLatLng);

        const distance = point.distanceTo(otherPoint);

        if (distance <= this.clusterRadius) {
          group.markers.push(other);
          group.count++;
          processed.add(other.key);

          group.center = [
            (group.center[0] * (group.count - 1) + other.latitude) /
              group.count,
            (group.center[1] * (group.count - 1) + other.longitude) /
              group.count,
          ];
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private async rebuildMarkers(
    mapCragItems: readonly MapCragItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;

    this.cleanMarkers();

    const clustering = this.shouldCluster();

    if (clustering) {
      const items = this.buildVisibleClusterItems(mapCragItems);
      if (!items.length) return;
      const groups = this.groupMarkersByProximity(items);

      for (const group of groups) {
        if (group.count === 1) {
          const it = group.markers[0];
          const latLng: [number, number] = [it.latitude, it.longitude];
          const isSelected = (() => {
            if (!selectedMapCragItem) return false;
            if (it.markerType === 'api')
              return it.apiItem?.id === selectedMapCragItem.id;
            if (it.markerType === 'crag')
              return (
                (it.cragFeature?.properties?.id ?? null) ===
                selectedMapCragItem.id
              );
            return false;
          })();
          const isFavorite = !!it.liked;

          const icon = new (L as any).DivIcon({
            html: this.cragLabelHtml(
              it.name,
              isSelected,
              isFavorite,
              it.markerType,
            ),
            className: 'pointer-events-none',
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });

          const marker = new (L as any).Marker(latLng, { icon }).addTo(
            this.map,
          );
          this.markers.push(marker);

          const onSelect = () => {
            // Center the map on the clicked item
            this.centerOn(it.latitude, it.longitude, 10);
            switch (it.markerType) {
              case 'api':
                if (it.apiItem) {
                  cb.onSelectedCragChange(it.apiItem);
                  // If the API item lacks details, fetch and refresh it
                  if (
                    it.apiItem.total_ascendables == null &&
                    it.apiItem.total_ascents == null
                  ) {
                    void this.global.refreshMapItemById(it.apiItem.id);
                  }
                }
                break;
              case 'crag': {
                const f = it.cragFeature as any;
                const coords = f?.geometry?.coordinates as number[] | undefined;
                const cragItem: MapCragItem = {
                  id: f?.properties?.id ?? 0,
                  name: f?.properties?.name ?? '',
                  slug: f?.properties?.slug ?? '',
                  area_name: f?.properties?.area_name ?? '',
                  area_slug: f?.properties?.area_slug ?? '',
                  country_name: f?.properties?.country_name ?? '',
                  country_slug: f?.properties?.country_slug ?? '',
                  category: f?.properties?.category as number,
                  avg_rating: (f?.properties?.avg_rating as number) ?? 0,
                  latitude: coords ? (coords[1] as number) : it.latitude,
                  longitude: coords ? (coords[0] as number) : it.longitude,
                  grades: (f?.properties?.grades as any) ?? {},
                  season: (f?.properties?.season as any) ?? [],
                  total_ascendables: f?.properties?.total_ascendables as
                    | number
                    | undefined,
                  total_ascents: f?.properties?.total_ascents as
                    | number
                    | undefined,
                  liked: f?.properties?.liked as boolean | undefined,
                };
                cb.onSelectedCragChange(cragItem);
                // Always try to refresh the crag from the API when coming from GeoJSON
                if (cragItem.id) {
                  void this.global.refreshMapItemById(cragItem.id);
                }
                break;
              }
              case 'area':
                this.showOrToggleAreaPolygonByKeys(it.areaKeys ?? [], it.name);
                break;
            }
          };

          marker.on('click', (e: import('leaflet').LeafletEvent) => {
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.preventDefault?.();
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.stopPropagation?.();
            onSelect();
          });
          this.attachMarkerKeyboardSelection(marker, onSelect);
        } else {
          const latLng = group.center;
          const icon = new (L as any).DivIcon({
            html: this.clusterLabelHtml(group.count),
            className: 'marker-cluster',
            iconSize: new (L as any).Point(40, 40),
            iconAnchor: [20, 20],
          });

          const marker = new (L as any).Marker(latLng as any, { icon }).addTo(
            this.map,
          );
          this.markers.push(marker);

          marker.on('click', (e: import('leaflet').LeafletEvent) => {
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.preventDefault?.();
            (
              (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
            )?.stopPropagation?.();

            const bounds = new (L as any).LatLngBounds(
              group.markers.map((c) => [c.latitude, c.longitude]),
            );

            this.map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 18,
              animate: true,
            });
          });
        }
      }
      return;
    }

    // Non-clustered: render API items as before
    // Only render markers within the current viewport (with slight padding)
    const bounds = this.map.getBounds().pad(0.1);
    const Lb = this.L as any;
    const visibleItems = mapCragItems.filter((c) =>
      bounds.contains(new Lb.LatLng(c.latitude, c.longitude)),
    );

    for (const mapCragItem of visibleItems) {
      const { latitude, longitude } = mapCragItem;
      const latLng: [number, number] = [latitude, longitude];
      const icon = new (L as any).DivIcon({
        html: this.cragLabelHtml(
          mapCragItem.name,
          selectedMapCragItem?.id === mapCragItem.id,
          this.global.liked(),
          'api',
        ),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = new (L as any).Marker(latLng, { icon }).addTo(this.map);
      this.markers.push(marker);

      marker.on('click', (e: import('leaflet').LeafletEvent) => {
        (
          (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.preventDefault?.();
        (
          (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.stopPropagation?.();
        this.centerOn(latitude, longitude, 10);
        cb.onSelectedCragChange(mapCragItem);
      });

      this.attachMarkerKeyboardSelection(marker, () =>
        cb.onSelectedCragChange(mapCragItem),
      );
    }
  }

  private cragLabelHtml(
    name: string,
    isSelected: boolean,
    isFavorite: boolean,
    markerType: 'api' | 'area' | 'crag' = 'api',
  ): string {
    let backgroundColorClass = 'lw-marker--primary';
    switch (markerType) {
      case 'area':
        backgroundColorClass = 'lw-marker--secondary';
        break;
      case 'crag':
        backgroundColorClass = 'lw-marker--accent';
        break;
    }

    // El resto del código se mantiene igual
    const scale = isSelected ? 1.4 : isFavorite ? 1.2 : 1;

    return `<div
        class="lw-marker ${backgroundColorClass} scale-[${scale}] w-fit px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent focus:outline-none"
        role="button"
        tabindex="0"
        aria-label="${name}"
        aria-pressed="${isSelected}">
        ${name}
        </div>`;
  }

  private clusterLabelHtml(count: number): string {
    return `<div class="lw-cluster">${count}</div>`;
  }

  private attachMarkerKeyboardSelection(
    marker: import('leaflet').Marker,
    onSelect: () => void,
  ): void {
    const el = marker.getElement();
    if (!el) return;
    el.addEventListener('keydown', (ev: KeyboardEvent) => {
      const key = ev.key;
      if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        onSelect();
      }
    });
  }

  private centerOn(lat: number, lng: number, minZoom = 6): void {
    if (!this.map) return;
    const targetZoom = Math.max(minZoom, this.map.getZoom());
    this.map.setView([lat, lng], targetZoom, { animate: true });
  }

  /**
   * Centers the map on the user's current location and draws/updates a marker.
   * Safe for SSR: does nothing on the server.
   */
  async goToCurrentLocation(): Promise<void> {
    if (!this.isBrowser() || !this.map || !this.L) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }
    const L = this.L;

    const position = await new Promise<GeolocationPosition | null>(
      (resolve) => {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: true, maximumAge: 120000, timeout: 7000 },
          );
        } catch {
          resolve(null);
        }
      },
    );

    if (!position) return;
    const { latitude, longitude } = position.coords;
    const latLng: [number, number] = [latitude, longitude];

    const icon = new (L as any).DivIcon({
      html: '<div class="lw-user-marker" aria-hidden="true"></div>',
      className: '',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
      this.userMarker = null;
    }

    this.userMarker = new (L as any).Marker(latLng, {
      icon,
      zIndexOffset: 1000,
    }).addTo(this.map);

    const nextZoom = Math.max(5, this.map.getZoom());
    this.map.setView(latLng, nextZoom, { animate: true });
  }
}
