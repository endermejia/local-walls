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

interface ClusterGroup {
  markers: MapCragItem[];
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
  private clusterRadius = 50; // Radio para agrupar marcadores en píxeles

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

    new L.TileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: options.maxZoom ?? 12,
        minZoom: options.minZoom ?? 6,
      },
    ).addTo(this.map);

    this.mapCragItems = mapCragItem;

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
            Math.min(9, options.maxZoom ?? 12),
          );
          await this.goToCurrentLocation();
        });
      }
    } catch {
      // ignore and fallback below
    }

    if (mapCragItem && mapCragItem.length) {
      const latLngs: [number, number][] = mapCragItem.map(
        (mapItem: MapCragItem) => [mapItem.latitude, mapItem.longitude],
      );
      const bounds = new (L as any).LatLngBounds(latLngs);
      this.map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: Math.min(9, options.maxZoom ?? 12),
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

    // Remove previous crag geojson layer
    if (this.cragsGeoJsonLayer) {
      this.map.removeLayer(this.cragsGeoJsonLayer);
      this.cragsGeoJsonLayer = null;
    }

    const viewBounds = this.map.getBounds().pad(0.1);
    const cragsLayer = new (L as any).GeoJSON(cragsData as any, {
      className: 'geojson-crag',
      filter: (feature: MapCragDataFeature) => {
        try {
          const coords = feature?.geometry?.coordinates;
          if (!coords || coords.length < 2) return false;
          const lat = coords[1] as number;
          const lng = coords[0] as number;
          return viewBounds.contains(new (L as any).LatLng(lat, lng));
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
    this.clearAreaNameMarkers();
    const viewBounds = this.map.getBounds().pad(0.1);
    for (const feature of areasData.features ?? []) {
      const name = feature?.properties?.name ?? '';
      if (!name) continue;
      const center = this.computeAreaCenter(feature);
      if (!center) continue;
      const latlng = new L.LatLng(center[0], center[1]);
      if (!viewBounds.contains(latlng)) continue;
      const icon = new L.DivIcon({
        html: this.cragLabelHtml(name, false, false),
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

  private groupMarkersByProximity(
    mapCragItems: readonly MapCragItem[],
  ): ClusterGroup[] {
    if (!this.map || !this.L) return [];
    const L = this.L;

    if (!this.shouldCluster()) {
      return mapCragItems.map((mapCragItem) => ({
        markers: [mapCragItem],
        center: [mapCragItem.latitude, mapCragItem.longitude],
        count: 1,
      }));
    }

    const groups: ClusterGroup[] = [];
    const processed = new Set<string>();

    for (const mapCragItem of mapCragItems) {
      if (processed.has(mapCragItem.slug)) continue;

      const latlng = new (L as any).LatLng(
        mapCragItem.latitude,
        mapCragItem.longitude,
      );
      const point = this.map.latLngToContainerPoint(latlng);

      const group: ClusterGroup = {
        markers: [mapCragItem],
        center: [mapCragItem.latitude, mapCragItem.longitude],
        count: 1,
      };

      processed.add(mapCragItem.slug);

      for (const otherCrag of mapCragItems) {
        if (
          otherCrag.slug === mapCragItem.slug ||
          processed.has(otherCrag.slug)
        )
          continue;

        const otherLatLng = new (L as any).LatLng(
          otherCrag.latitude,
          otherCrag.longitude,
        );
        const otherPoint = this.map.latLngToContainerPoint(otherLatLng);

        const distance = point.distanceTo(otherPoint);

        if (distance <= this.clusterRadius) {
          group.markers.push(otherCrag);
          group.count++;
          processed.add(otherCrag.slug);

          group.center = [
            (group.center[0] * (group.count - 1) + otherCrag.latitude) /
              group.count,
            (group.center[1] * (group.count - 1) + otherCrag.longitude) /
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

    // Only render markers within the current viewport (with slight padding)
    const bounds = this.map.getBounds().pad(0.1);
    const Lb = this.L as any;
    const visibleItems = mapCragItems.filter((c) =>
      bounds.contains(new Lb.LatLng(c.latitude, c.longitude)),
    );

    if (!visibleItems.length) return;

    const groups = this.groupMarkersByProximity(visibleItems);

    for (const group of groups) {
      if (group.count === 1) {
        const mapCragItem = group.markers[0];
        const { latitude, longitude } = mapCragItem;
        const latLng: [number, number] = [latitude, longitude];
        const icon = new (L as any).DivIcon({
          html: this.cragLabelHtml(
            mapCragItem.name,
            selectedMapCragItem?.id === mapCragItem.id,
            this.global.liked(),
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
          cb.onSelectedCragChange(mapCragItem);
        });

        this.attachMarkerKeyboardSelection(marker, () =>
          cb.onSelectedCragChange(mapCragItem),
        );
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
            maxZoom: 12,
            animate: true,
          });
        });
      }
    }
  }

  private cragLabelHtml(
    name: string,
    isSelected: boolean,
    isFavorite: boolean,
  ): string {
    const variant = isFavorite ? 'lw-marker--accent' : 'lw-marker--primary';
    return `<div class="lw-marker ${variant} w-fit px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent focus:outline-none" role="button" tabindex="0" aria-label="${name}" aria-pressed="${isSelected}">${name}</div>`;
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
