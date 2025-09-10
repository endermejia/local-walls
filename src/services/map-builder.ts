import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';
import { MapCragItem, MapOptions } from '../models';

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

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  async init(
    el: HTMLElement,
    options: MapOptions,
    mapCragItem: readonly MapCragItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (this.initialized || !this.isBrowser()) return;
    const [{ default: L }] = await Promise.all([import('leaflet')]);
    this.L = L;

    this.map = new L.Map(el, {
      center: options.center ?? [39.5, -0.5],
      zoom: options.zoom ?? 5,
      worldCopyJump: true,
    });

    new L.TileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: options.maxZoom ?? 15,
        minZoom: options.minZoom ?? 5,
      },
    ).addTo(this.map);

    this.mapCragItems = mapCragItem;
    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);

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
            Math.min(9, options.maxZoom ?? 15),
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
      const bounds = new L.LatLngBounds(latLngs);
      this.map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: Math.min(9, options.maxZoom ?? 15),
      });
    }

    this.map.on('click', () => {
      cb.onSelectedCragChange(null);
      cb.onMapClick();
    });

    const collapseOnInteraction = () => cb.onInteractionStart();
    this.map.on('movestart', collapseOnInteraction);
    this.map.on('zoomstart', collapseOnInteraction);

    this.map.on('moveend', async () => {
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
    });
    this.map.on('zoomend', async () => {
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
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
          raf(() => this.map?.invalidateSize?.());
        });
      } else {
        this.map?.invalidateSize?.();
      }
    }
  }

  async updateData(
    mapCragItem: readonly MapCragItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map) return;
    this.mapCragItems = mapCragItem;
    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);
  }

  destroy(): void {
    try {
      this.cleanMarkers();
      this.map?.remove?.();
    } catch {
      // ignore
    }
    this.initialized = false;
    this.L = null;
  }

  private cleanMarkers(): void {
    if (!this.map || !this.L) return;

    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  private shouldCluster(): boolean {
    if (!this.map) return true;
    const zoom = this.map.getZoom();
    return this.clusteringEnabled && zoom < 15;
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

    const groups = this.groupMarkersByProximity(mapCragItems);

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
            maxZoom: 15,
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
