import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';
import type { Crag, MapOptions, MapVisibleElements } from '../models';

export interface MapBuilderCallbacks {
  onSelectedCragChange: (crag: Crag | null) => void;
  onMapClick: () => void;
  onInteractionStart: () => void;
  onVisibleChange: (visible: MapVisibleElements) => void;
  onViewportChange: (v: {
    south_west_latitude: number;
    south_west_longitude: number;
    north_east_latitude: number;
    north_east_longitude: number;
    zoom: number;
  }) => void;
}

interface ClusterGroup {
  markers: Crag[];
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
  private cragsData: readonly Crag[] = [];
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
    crags: readonly Crag[],
    selectedCrag: Crag | null,
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

    this.cragsData = crags;
    await this.rebuildMarkers(crags, selectedCrag, cb);

    try {
      if (
        this.isBrowser() &&
        typeof navigator !== 'undefined' &&
        'geolocation' in navigator
      ) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            this.map.setView(
              [latitude, longitude],
              Math.min(9, (options.maxZoom ?? 15)),
            );
            // Also create the user location marker on first load
            await this.goToCurrentLocation();
          },
          () => {
            // Fallback: fit to existing crags if any
            if (crags && crags.length) {
              const latLngs: [number, number][] = crags.map((c) => [
                c.location.lat,
                c.location.lng,
              ]);
              const bounds = new L.LatLngBounds(latLngs);
              this.map.fitBounds(bounds, { padding: [24, 24], maxZoom: Math.min(9, (options.maxZoom ?? 15)) });
            }
          },
          { enableHighAccuracy: false, maximumAge: 600000, timeout: 5000 },
        );
      }
    } catch {
      // ignore and fallback below
    }

    if (crags && crags.length) {
      const latLngs: [number, number][] = crags.map((c) => [
        c.location.lat,
        c.location.lng,
      ]);
      const bounds = new L.LatLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [24, 24], maxZoom: Math.min(9, (options.maxZoom ?? 15)) });
    }

    this.map.on('click', () => {
      cb.onSelectedCragChange(null);
      cb.onMapClick();
    });

    const recalcVisible = () => this.updateVisibleIdsFromCurrentBounds(cb);
    await recalcVisible();

    const collapseOnInteraction = () => cb.onInteractionStart();
    this.map.on('movestart', collapseOnInteraction);
    this.map.on('zoomstart', collapseOnInteraction);

    this.map.on('moveend', async () => {
      await this.updateVisibleIdsFromCurrentBounds(cb);
      await this.rebuildMarkers(this.cragsData, selectedCrag, cb);
    });
    this.map.on('zoomend', async () => {
      await this.updateVisibleIdsFromCurrentBounds(cb);
      await this.rebuildMarkers(this.cragsData, selectedCrag, cb);
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
    crags: readonly Crag[],
    selectedCrag: Crag | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map) return;
    this.cragsData = crags;
    await this.rebuildMarkers(crags, selectedCrag, cb);
    await this.updateVisibleIdsFromCurrentBounds(cb);
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

  private groupMarkersByProximity(crags: readonly Crag[]): ClusterGroup[] {
    if (!this.map || !this.L) return [];
    const L = this.L;

    if (!this.shouldCluster()) {
      return crags.map((c) => ({
        markers: [c],
        center: [c.location.lat, c.location.lng],
        count: 1,
      }));
    }

    const groups: ClusterGroup[] = [];
    const processed = new Set<string>();

    for (const crag of crags) {
      if (processed.has(crag.id)) continue;

      const latlng = new (L as any).LatLng(
        crag.location.lat,
        crag.location.lng,
      );
      const point = this.map.latLngToContainerPoint(latlng);

      const group: ClusterGroup = {
        markers: [crag],
        center: [crag.location.lat, crag.location.lng],
        count: 1,
      };

      processed.add(crag.id);

      for (const otherCrag of crags) {
        if (otherCrag.id === crag.id || processed.has(otherCrag.id)) continue;

        const otherLatLng = new (L as any).LatLng(
          otherCrag.location.lat,
          otherCrag.location.lng,
        );
        const otherPoint = this.map.latLngToContainerPoint(otherLatLng);

        const distance = point.distanceTo(otherPoint);

        if (distance <= this.clusterRadius) {
          group.markers.push(otherCrag);
          group.count++;
          processed.add(otherCrag.id);

          group.center = [
            (group.center[0] * (group.count - 1) + otherCrag.location.lat) /
              group.count,
            (group.center[1] * (group.count - 1) + otherCrag.location.lng) /
              group.count,
          ];
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private async rebuildMarkers(
    crags: readonly Crag[],
    selectedCrag: Crag | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;

    this.cleanMarkers();

    const groups = this.groupMarkersByProximity(crags);

    for (const group of groups) {
      if (group.count === 1) {
        const crag = group.markers[0];
        const { lat, lng } = crag.location;
        const latLng: [number, number] = [lat, lng];
        const icon = new (L as any).DivIcon({
          html: this.cragLabelHtml(
            crag.name,
            selectedCrag?.id === crag.id,
            this.global.isCragLiked()(crag.id),
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
          cb.onSelectedCragChange(crag);
        });

        this.attachMarkerKeyboardSelection(marker, () =>
          cb.onSelectedCragChange(crag),
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
            group.markers.map((c) => [c.location.lat, c.location.lng]),
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

  private async updateVisibleIdsFromCurrentBounds(
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;
    const bounds = this.map.getBounds();
    const visibleZones = new Set<string>();
    const visibleCrags = new Set<string>();

    for (const c of this.cragsData) {
      const { lat, lng } = c.location;
      const wrapped = new (L as any).LatLng(lat, lng).wrap();
      if (bounds.contains(wrapped)) {
        visibleZones.add(c.zoneId);
        visibleCrags.add(c.id);
      }
    }

    cb.onVisibleChange({
      zoneIds: Array.from(visibleZones),
      cragIds: Array.from(visibleCrags),
    });

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    cb.onViewportChange({
      south_west_latitude: sw.lat,
      south_west_longitude: sw.lng,
      north_east_latitude: ne.lat,
      north_east_longitude: ne.lng,
      zoom: this.map.getZoom(),
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
