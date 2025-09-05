import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Crag, MapOptions, MapVisibleElements } from '../models';
import { GlobalData } from './global-data';

export interface MapBuilderCallbacks {
  onSelectedCragChange: (crag: Crag | null) => void;
  onMapClick: () => void;
  onInteractionStart: () => void;
  onVisibleChange: (visible: MapVisibleElements) => void;
}

interface ClusterGroup {
  markers: any[];
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
  private markers: any[] = [];
  private clusterGroups: ClusterGroup[] = [];
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

    this.map = new (L as any).Map(el, {
      center: options.center ?? [39.5, -0.5],
      zoom: options.zoom ?? 7,
      worldCopyJump: true,
    });

    new (L as any).TileLayer(
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
      const bounds = new (L as any).LatLngBounds(latLngs as any);
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

    // Recalcular clusters al cambiar el zoom o mover el mapa
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
      // Limpiar todos los marcadores
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

    // Eliminar todos los marcadores
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
    this.clusterGroups = [];
  }

  private shouldCluster(): boolean {
    // Determinar si se debe hacer clustering basado en el nivel de zoom
    // A niveles de zoom altos (>15) mostramos marcadores individuales
    if (!this.map) return true;
    const zoom = this.map.getZoom();
    return this.clusteringEnabled && zoom < 15;
  }

  private groupMarkersByProximity(crags: readonly Crag[]): ClusterGroup[] {
    if (!this.map || !this.L) return [];
    const L = this.L;

    if (!this.shouldCluster()) {
      // Si no se agrupan, cada marcador es su propio "grupo"
      return crags.map((c) => ({
        markers: [c],
        center: [c.ubication.lat, c.ubication.lng],
        count: 1,
      }));
    }

    const groups: ClusterGroup[] = [];
    const processed = new Set<string>();

    // Para cada crag, buscar otros crags cercanos
    for (const crag of crags) {
      if (processed.has(crag.id)) continue;

      // Calcular la posición del marcador en píxeles
      const latlng = new (L as any).LatLng(
        crag.ubication.lat,
        crag.ubication.lng,
      );
      const point = this.map.latLngToContainerPoint(latlng);

      const group: ClusterGroup = {
        markers: [crag],
        center: [crag.ubication.lat, crag.ubication.lng],
        count: 1,
      };

      processed.add(crag.id);

      // Buscar otros crags cercanos
      for (const otherCrag of crags) {
        if (otherCrag.id === crag.id || processed.has(otherCrag.id)) continue;

        const otherLatLng = new (L as any).LatLng(
          otherCrag.ubication.lat,
          otherCrag.ubication.lng,
        );
        const otherPoint = this.map.latLngToContainerPoint(otherLatLng);

        // Calcular distancia en píxeles
        const distance = point.distanceTo(otherPoint);

        if (distance <= this.clusterRadius) {
          group.markers.push(otherCrag);
          group.count++;
          processed.add(otherCrag.id);

          // Actualizar el centro (promedio de latitudes y longitudes)
          group.center = [
            (group.center[0] * (group.count - 1) + otherCrag.ubication.lat) /
              group.count,
            (group.center[1] * (group.count - 1) + otherCrag.ubication.lng) /
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

    // Limpiar marcadores existentes
    this.cleanMarkers();

    // Agrupar marcadores por proximidad
    const groups = this.groupMarkersByProximity(crags);
    this.clusterGroups = groups;

    // Crear marcadores para cada grupo
    for (const group of groups) {
      if (group.count === 1) {
        // Marcador individual
        const crag = group.markers[0];
        const { lat, lng } = crag.ubication;
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

        const marker = new (L as any).Marker(latLng as any, { icon }).addTo(
          this.map,
        );
        this.markers.push(marker);

        marker.on('click', (e: import('leaflet').LeafletEvent) => {
          // Prevent map click and any default zoom behavior on marker click
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
        // Grupo de marcadores (cluster)
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
          // Prevent map click
          (
            (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
          )?.preventDefault?.();
          (
            (e as any).originalEvent as MouseEvent | PointerEvent | TouchEvent
          )?.stopPropagation?.();

          // Zoom hacia el grupo al hacer clic
          const bounds = new (L as any).LatLngBounds(
            group.markers.map((c) => [c.ubication.lat, c.ubication.lng]),
          );

          this.map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15, // Limitar el zoom para evitar acercarse demasiado
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
      const { lat, lng } = c.ubication;
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
  }
}
