import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Crag, MapOptions, MapVisibleElements } from '../models';

export interface MapBuilderCallbacks {
  onSelectedCragChange: (crag: Crag | null) => void;
  onMapClick: () => void;
  onInteractionStart: () => void;
  onVisibleChange: (visible: MapVisibleElements) => void;
}

@Injectable({ providedIn: 'root' })
export class MapBuilder {
  private readonly platformId = inject(PLATFORM_ID);
  private map: import('leaflet').Map | null = null;
  private initialized = false;
  private L: typeof import('leaflet') | null = null;
  private cragsData: readonly Crag[] = [];

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

    this.map = L.map(el, {
      center: options.center ?? [39.5, -0.5],
      zoom: options.zoom ?? 7,
      worldCopyJump: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: options.maxZoom ?? 19,
        minZoom: options.minZoom ?? 5,
      },
    ).addTo(this.map);

    this.cragsData = crags;
    await this.rebuildMarkers(crags, selectedCrag, cb);

    // Fit bounds only once on the initial map init
    if (crags && crags.length) {
      const latLngs: [number, number][] = crags.map((c) => [
        c.ubication.lat,
        c.ubication.lng,
      ]);
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [24, 24] });
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
    this.map.on('moveend', recalcVisible);
    this.map.on('zoomend', recalcVisible);

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
      this.map?.remove?.();
    } catch {
      // ignore
    }
    this.map = null;
    this.initialized = false;
    this.L = null;
  }

  private async rebuildMarkers(
    crags: readonly Crag[],
    selectedCrag: Crag | null,
    cb: MapBuilderCallbacks,
  ): Promise<void> {
    if (!this.map || !this.L) return;
    const L = this.L;

    // Remove existing markers only
    this.map.eachLayer((layer: import('leaflet').Layer) => {
      if (layer instanceof L.Marker) {
        this.map!.removeLayer(layer);
      }
    });

    for (const c of crags) {
      const { lat, lng } = c.ubication;
      const latLng: [number, number] = [lat, lng];
      const icon = L.divIcon({
        html: this.cragLabelHtml(c.name, selectedCrag?.id === c.id),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(latLng, { icon }).addTo(this.map);
      marker.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        // Prevent map click and any default zoom behavior on marker click
        (
          e.originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.preventDefault?.();
        (
          e.originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.stopPropagation?.();
        cb.onSelectedCragChange(c);
      });
      this.attachMarkerKeyboardSelection(marker, () =>
        cb.onSelectedCragChange(c),
      );
    }
  }

  private cragLabelHtml(name: string, isSelected: boolean): string {
    return `<div class="w-fit bg-black/70 text-white px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent shadow hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/70" role="button" tabindex="0" aria-label="${name}" aria-pressed="${isSelected}">${name}</div>`;
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
      const { lat, lng } = c.ubication;
      const wrapped = L.latLng(lat, lng).wrap();
      if (bounds.contains(wrapped)) {
        visibleZones.add(c.zoneId);
        visibleCrags.add(c.id);
      }
    }

    cb.onVisibleChange({
      zoneIds: Array.from(visibleZones),
      cragIds: Array.from(visibleCrags),
    });
  }
}
