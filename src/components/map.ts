import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  ViewChild,
  effect,
  model,
  InputSignal,
  OutputEmitterRef,
  ModelSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Crag } from '../models';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `
    <div
      #container
      class="w-full grow min-h-0"
      aria-label="Interactive map"
      role="application"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow min-h-0 w-full',
  },
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  crags: InputSignal<Crag[]> = input<Crag[]>([]);
  selectedCrag: ModelSignal<Crag | null> = model<Crag | null>(null);
  mapClick: OutputEmitterRef<void> = output<void>();
  interactionStart: OutputEmitterRef<void> = output<void>();
  visibleChange: OutputEmitterRef<{
    zoneIds: string[];
    cragIds: string[];
  }> = output<{
    zoneIds: string[];
    cragIds: string[];
  }>();

  @ViewChild('container', { read: ElementRef })
  private containerRef?: ElementRef<HTMLElement>;

  private _map: import('leaflet').Map | null = null;
  private _mapInitialized = false;

  constructor() {
    effect(() => {
      this.crags();
      this.selectedCrag();
      if (this._mapInitialized) {
        void this.rebuildMarkers();
      }
    });
  }

  ngAfterViewInit(): void {
    this.tryInit();
  }

  ngOnDestroy(): void {
    try {
      this._map?.remove?.();
    } catch {
      // ignore
    }
    this._map = null;
    this._mapInitialized = false;
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  private tryInit(): void {
    const el = this.containerRef?.nativeElement;
    if (!el || this._mapInitialized || !this.isBrowser()) return;
    const raf = (
      window as unknown as {
        requestAnimationFrame?: (cb: FrameRequestCallback) => number;
      }
    ).requestAnimationFrame;
    if (typeof raf === 'function') {
      raf(() => void this.initMap());
    } else {
      void this.initMap();
    }
  }

  private async initMap(): Promise<void> {
    if (this._mapInitialized || !this.isBrowser()) return;
    const [{ default: L }] = await Promise.all([import('leaflet')]);

    const el = this.containerRef?.nativeElement;
    if (!el) return;

    this._map = L.map(el, {
      center: [39.5, -0.5],
      zoom: 7,
      worldCopyJump: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        minZoom: 5,
      },
    ).addTo(this._map);

    await this.rebuildMarkers();

    // Fit bounds only once on the initial component init
    const crags = this.crags();
    if (crags && crags.length) {
      const latLngs: [number, number][] = crags.map((c) => [
        c.ubication.lat,
        c.ubication.lng,
      ]);
      const bounds = L.latLngBounds(latLngs);
      this._map.fitBounds(bounds, { padding: [24, 24] });
    }

    this._map.on('click', () => {
      this.selectedCrag.set(null);
      this.mapClick.emit();
    });

    const recalcVisible = () => this.updateVisibleIdsFromCurrentBounds(L);
    await recalcVisible();

    const collapseOnInteraction = () => this.interactionStart.emit();
    this._map.on('movestart', collapseOnInteraction);
    this._map.on('zoomstart', collapseOnInteraction);
    this._map.on('moveend', recalcVisible);
    this._map.on('zoomend', recalcVisible);

    this._mapInitialized = true;

    if (typeof window !== 'undefined') {
      const raf = (
        window as unknown as {
          requestAnimationFrame?: (cb: FrameRequestCallback) => number;
        }
      ).requestAnimationFrame;
      if (typeof raf === 'function') {
        raf(() => {
          this._map?.invalidateSize?.();
          raf(() => this._map?.invalidateSize?.());
        });
      } else {
        this._map?.invalidateSize?.();
      }
    }
  }

  private async rebuildMarkers(): Promise<void> {
    if (!this._map) return;
    const [{ default: L }] = await Promise.all([import('leaflet')]);

    // Remove existing markers only
    this._map.eachLayer((layer: import('leaflet').Layer) => {
      if (layer instanceof L.Marker) {
        this._map!.removeLayer(layer);
      }
    });

    for (const c of this.crags()) {
      const { lat, lng } = c.ubication;
      const latLng: [number, number] = [lat, lng];
      const icon = L.divIcon({
        html: this.cragLabelHtml(c.name, this.selectedCrag()?.id === c.id),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(latLng, { icon }).addTo(this._map);
      marker.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        // Prevent map click and any default zoom behavior on marker click
        (
          e.originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.preventDefault?.();
        (
          e.originalEvent as MouseEvent | PointerEvent | TouchEvent
        )?.stopPropagation?.();
        this.selectedCrag.set(c);
      });
      this.attachMarkerKeyboardSelection(marker, c);
    }
  }

  private cragLabelHtml(name: string, isSelected: boolean): string {
    return `<div class="w-fit bg-black/70 text-white px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent shadow hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/70" role="button" tabindex="0" aria-label="${name}" aria-pressed="${isSelected}">${name}</div>`;
  }

  private attachMarkerKeyboardSelection(
    marker: import('leaflet').Marker,
    crag: Crag,
  ): void {
    const el = marker.getElement();
    if (!el) return;
    el.addEventListener('keydown', (ev: KeyboardEvent) => {
      const key = ev.key;
      if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.selectedCrag.set(crag);
      }
    });
  }

  private async updateVisibleIdsFromCurrentBounds(
    L: typeof import('leaflet'),
  ): Promise<void> {
    if (!this._map) return;
    const bounds = this._map.getBounds();
    const visibleZones = new Set<string>();
    const visibleCrags = new Set<string>();
    for (const c of this.crags()) {
      const { lat, lng } = c.ubication;
      const wrapped = L.latLng(lat, lng).wrap();
      if (bounds.contains(wrapped)) {
        visibleZones.add(c.zoneId);
        visibleCrags.add(c.id);
      }
    }
    this.visibleChange.emit({
      zoneIds: Array.from(visibleZones),
      cragIds: Array.from(visibleCrags),
    });
  }
}
