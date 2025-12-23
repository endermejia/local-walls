import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';
import { LocalStorage } from './local-storage';
import {
  MapCragItem,
  MapOptions,
  MapCragDataFeature,
  MapBounds,
} from '../models';
import { Map, Marker, LeafletNamespace, LeafletEvent } from 'leaflet';

export interface MapBuilderCallbacks {
  onSelectedCragChange: (mapCragItem: MapCragItem | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  onInteractionStart: () => void;
  onViewportChange: (v: MapBounds) => void;
}

interface ClusterItem {
  latitude: number;
  longitude: number;
  name: string;
  key: string;
  markerType: 'api' | 'crag';
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly global = inject(GlobalData);
  private readonly localStorage = inject(LocalStorage);
  private map!: Map;
  private initialized = false;
  private L: LeafletNamespace | null = null;
  private mapCragItems: readonly MapCragItem[] = [];
  private markers: Marker[] = [];
  private userMarker: Marker | null = null;
  private clusteringEnabled = true;
  private clusterRadius = 50; // Marker grouping radius in pixels
  // Control whether cluster markers should animate on next rebuild
  private animateClustersOnNextBuild = true;

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  /**
   * Initializes the map with provided configuration and data.
   * @param el - HTML element to render the map into
   * @param options - Map configuration options
   * @param mapCragItem - Array of crag items to display on the map
   * @param selectedMapCragItem - Currently selected crag item, if any
   * @param cb - Callback functions for map interactions
   */
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
      zoom: options.zoom ?? 6,
      worldCopyJump: true,
    });

    new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: options.maxZoom ?? 18,
      minZoom: options.minZoom ?? 6,
    }).addTo(this.map);

    this.mapCragItems = mapCragItem;

    // Restore the last saved viewport (bounds and zoom) if available
    let savedViewport = options.ignoreSavedViewport
      ? null
      : this.global.mapBounds();
    if (savedViewport && !this.areBoundsValid(savedViewport)) {
      savedViewport = null;
    }

    if (!options.ignoreSavedViewport) {
      if (savedViewport && this.areBoundsValid(savedViewport)) {
        try {
          const bounds = new L.LatLngBounds([
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
          const minZ = options.minZoom ?? 6;
          const maxZ = options.maxZoom ?? 18;
          const targetZ = Math.max(minZ, Math.min(maxZ, savedViewport.zoom));
          this.map.setZoom(targetZ);
        } catch (e) {
          console.warn('Failed to fit bounds from saved viewport', e);
        }
      } else {
        // Fallback: read directly from LocalStorage if GlobalData not hydrated yet
        const raw = this.localStorage.getItem('map_bounds_v1');
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as MapBounds;
            if (this.areBoundsValid(parsed)) {
              savedViewport = parsed;
              this.global.mapBounds.set(parsed);
              const bounds = new L.LatLngBounds([
                [parsed.south_west_latitude, parsed.south_west_longitude],
                [parsed.north_east_latitude, parsed.north_east_longitude],
              ]);
              this.map.fitBounds(bounds);
              this.map.setZoom(parsed.zoom);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);
    // Disable cluster spawn animation after the first render to avoid flicker on pans
    this.animateClustersOnNextBuild = false;

    // Determine if we should attempt geolocation: only on mobile devices
    const isMobileClient = (() => {
      if (!this.isBrowser() || typeof navigator === 'undefined') return false;
      const ua = (navigator.userAgent || '').toLowerCase();
      // Simple mobile heuristic; avoids desktops where geolocation UX is worse
      return /iphone|ipad|ipod|android|mobile/.test(ua);
    })();

    try {
      // Only attempt geolocation when no saved viewport is present.
      if (!savedViewport) {
        // If we already have a cached user location, use it on any device.
        const hasCachedUserLocation =
          !!this.localStorage.getItem('lw_user_location');
        if (hasCachedUserLocation) {
          await this.goToCurrentLocation();
        } else if (isMobileClient) {
          // Otherwise, only attempt geolocation automatically on mobile clients
          await this.goToCurrentLocation();
        }
      }
    } catch {
      // ignore and fallback below
    }

    if (
      !options.ignoreSavedViewport &&
      !savedViewport &&
      mapCragItem &&
      mapCragItem.length
    ) {
      const latLngs: [number, number][] = mapCragItem.map(
        (mapItem: MapCragItem) => [mapItem.latitude, mapItem.longitude],
      );
      const bounds = new L.LatLngBounds(latLngs);
      this.map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: Math.min(9, options.maxZoom ?? 18),
      });
    }

    this.map.on('click', (e: LeafletEvent) => {
      const latlng = e.latlng;
      cb.onSelectedCragChange(null);
      if (latlng) cb.onMapClick(latlng.lat, latlng.lng);
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
      // Do not animate clusters on regular pan updates to prevent flicker
      this.animateClustersOnNextBuild = false;
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
      emitViewport();
    });
    this.map.on('zoomend', async () => {
      // Also suppress spawn animation on zoom updates (can be adjusted if desired)
      this.animateClustersOnNextBuild = false;
      await this.rebuildMarkers(this.mapCragItems, selectedMapCragItem, cb);
      emitViewport();
    });

    this.initialized = true;

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        this.map?.invalidateSize?.();
        window.requestAnimationFrame(() => {
          this.map?.invalidateSize?.();
          emitViewport();
        });
      });
    }
  }

  /**
   * Updates map data (crag items and selection) and triggers a marker rebuild.
   */
  async updateData(
    mapCragItem: readonly MapCragItem[],
    selectedMapCragItem: MapCragItem | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map) return;
    this.mapCragItems = mapCragItem;

    await this.rebuildMarkers(mapCragItem, selectedMapCragItem, cb);
  }

  /**
   * Cleans up and removes the map instance and all associated markers and layers.
   */
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
    return this.clusteringEnabled && zoom < 12;
  }

  // Build a unified list of clusterable items across API crags and area labels
  private buildVisibleClusterItems(
    apiItems: readonly MapCragItem[],
  ): ClusterItem[] {
    if (!this.map || !this.L) return [];
    const L = this.L!;
    const bounds = this.map.getBounds().pad(0.1);
    const items: ClusterItem[] = [];

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

    return items;
  }

  private groupMarkersByProximity(
    items: readonly ClusterItem[],
  ): ClusterGroup[] {
    if (!this.map || !this.L) return [];
    const L = this.L!;

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
          const isSelected =
            selectedMapCragItem && it.apiItem?.id === selectedMapCragItem.id;
          const isFavorite = !!it.liked;

          const icon = new L.DivIcon({
            html: this.cragLabelHtml(
              it.name,
              isSelected as boolean,
              isFavorite,
              it.markerType,
            ),
            className: 'pointer-events-none',
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });

          const marker = new L.Marker(latLng, { icon }).addTo(this.map);
          this.markers.push(marker);

          const onSelect = async () => {
            // Center the map on the clicked item
            this.centerOn(it.latitude, it.longitude, 10);
            if (it.apiItem) {
              cb.onSelectedCragChange(it.apiItem);
            }
          };

          marker.on('click', (e: LeafletEvent) => {
            e.originalEvent?.preventDefault?.();
            (e.originalEvent as Event | undefined)?.stopPropagation?.();
            onSelect();
          });
          this.attachMarkerKeyboardSelection(marker, onSelect);
        } else {
          const latLng = group.center;
          // Dynamic cluster size based on count
          const size =
            group.count >= 200
              ? 72
              : group.count >= 100
                ? 58
                : group.count >= 50
                  ? 46
                  : group.count >= 10
                    ? 36
                    : 28;
          const icon = new L.DivIcon({
            html: this.clusterLabelHtml(group.count),
            className: 'marker-cluster',
            iconSize: new L.Point(size, size),
            iconAnchor: [size / 2, size / 2],
          });

          const marker = new L.Marker(latLng as [number, number], {
            icon,
          }).addTo(this.map);
          this.markers.push(marker);

          marker.on('click', (e: LeafletEvent) => {
            e.originalEvent?.preventDefault?.();
            (e.originalEvent as Event | undefined)?.stopPropagation?.();

            const bounds = new L.LatLngBounds(
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
    const visibleItems = mapCragItems.filter((c) =>
      bounds.contains(new L.LatLng(c.latitude, c.longitude)),
    );

    for (const mapCragItem of visibleItems) {
      const { latitude, longitude } = mapCragItem;
      const latLng: [number, number] = [latitude, longitude];
      const icon = new L.DivIcon({
        html: this.cragLabelHtml(
          mapCragItem.name,
          selectedMapCragItem?.id === mapCragItem.id,
          !!mapCragItem.liked, // Use item's liked status directly
          'api',
        ),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = new L.Marker(latLng, { icon }).addTo(this.map);
      this.markers.push(marker);

      marker.on('click', (e: LeafletEvent) => {
        e.originalEvent?.preventDefault?.();
        (e.originalEvent as Event | undefined)?.stopPropagation?.();
        this.centerOn(latitude, longitude, 10);
        cb.onSelectedCragChange(mapCragItem);
      });

      this.attachMarkerKeyboardSelection(marker, () => {
        this.centerOn(latitude, longitude, 10);
        cb.onSelectedCragChange(mapCragItem);
      });
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
    // The rest of the code remains the same
    const scale = isSelected ? 1.1 : isFavorite ? 1.2 : 1;

    return `<div
        class="lw-marker ${backgroundColorClass} w-fit px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent focus:outline-none"
        style="transform: scale(${scale});"
        role="button"
        tabindex="0"
        aria-label="${name}"
        aria-pressed="${isSelected}">
        ${name}
        </div>`;
  }

  private clusterLabelHtml(count: number): string {
    const sizeClass =
      count >= 200
        ? 'xl'
        : count >= 100
          ? 'lg'
          : count >= 50
            ? 'md'
            : count >= 10
              ? 'sm'
              : 'xs';
    const spawnClass = this.animateClustersOnNextBuild
      ? ' lw-cluster--spawn'
      : '';
    return `<div class="lw-cluster lw-cluster--${sizeClass}${spawnClass}" data-count="${count}">${count}</div>`;
  }

  private attachMarkerKeyboardSelection(
    marker: Marker,
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
   * Uses browser's geolocation API to get the current position.
   * @returns Promise that resolves when location is set or fails silently
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

    const icon = new L.DivIcon({
      html: '<div class="lw-user-marker" aria-hidden="true"></div>',
      className: '',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
      this.userMarker = null;
    }

    this.userMarker = new L.Marker(latLng, {
      icon,
      zIndexOffset: 1000,
    }).addTo(this.map);

    const nextZoom = Math.max(12, this.map.getZoom());
    this.map.setView(latLng, nextZoom, { animate: true });
  }

  private selectionMarker: Marker | null = null;
  public setSelectionMarker(lat: number, lng: number): void {
    if (!this.map || !this.L) return;
    const L = this.L;

    if (this.selectionMarker) {
      this.map.removeLayer(this.selectionMarker);
    }

    const icon = new L.DivIcon({
      html: `
        <div class="relative -translate-x-1/2 -translate-y-full">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="var(--tui-text-primary)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
             <circle cx="12" cy="10" r="3" fill="var(--tui-background-base)"></circle>
           </svg>
        </div>`,
      className: 'pointer-events-none display-contents',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    this.selectionMarker = new L.Marker([lat, lng], {
      icon,
      zIndexOffset: 2000,
    }).addTo(this.map);
  }

  private areBoundsValid(bounds: MapBounds): boolean {
    return (
      Number.isFinite(bounds.south_west_latitude) &&
      Number.isFinite(bounds.south_west_longitude) &&
      Number.isFinite(bounds.north_east_latitude) &&
      Number.isFinite(bounds.north_east_longitude)
    );
  }
}
