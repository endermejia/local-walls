// Ambient typings for Leaflet 2 ESM (minimal, focused on used API)
// These declarations are intentionally lightweight and SSR-safe.
declare module 'leaflet' {
  export interface LatLng {
    lat: number;
    lng: number;
  }
  export interface LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    contains(ll: LatLng): boolean;
    pad(ratio: number): LatLngBounds;
  }
  export interface Point {
    x: number;
    y: number;
    distanceTo(other: Point): number;
  }
  export interface LeafletEvent {
    originalEvent?: Event;
  }

  export interface Layer {
    addTo(map: Map): this;
    remove(): this;
    on(event: string, handler: (e: LeafletEvent) => void): this;
  }

  export interface Icon {}
  export interface DivIconOptions {
    html?: string;
    className?: string;
    iconSize?: [number, number] | Point;
    iconAnchor?: [number, number] | Point;
  }
  export interface DivIcon extends Icon {}

  export interface Marker extends Layer {
    getLatLng(): LatLng;
    setIcon(icon: Icon): this;
    getElement(): HTMLElement | null;
  }
  export interface TileLayer extends Layer {}

  export interface Map {
    getBounds(): LatLngBounds;
    fitBounds(
      bounds: LatLngBounds,
      options?: {
        padding?: [number, number];
        maxZoom?: number;
        animate?: boolean;
      },
    ): this;
    getZoom(): number;
    setZoom(z: number): this;
    on(event: string, handler: (e: LeafletEvent) => void): this;
    panTo(latlng: LatLng): this;
    setView(
      center: [number, number],
      zoom: number,
      options?: { animate?: boolean },
    ): this;
    latLngToContainerPoint(latlng: LatLng): Point;
    invalidateSize(): this;
    remove(): this;
    removeLayer(layer: Layer): this;
  }

  export interface GeoJSONOptions {
    className?: string;
    filter?(f: any): boolean;
    pointToLayer?(feature: any, latlng: LatLng): Layer;
  }
  export interface GeoJSON extends Layer {}

  export interface LeafletNamespace {
    Map: new (el: any, opts?: any) => Map;
    TileLayer: new (url: string, opts?: any) => TileLayer;
    Marker: new (latlng: LatLng | [number, number], opts?: any) => Marker;
    DivIcon: new (opts?: DivIconOptions) => DivIcon;
    LatLng: new (lat: number, lng: number) => LatLng;
    LatLngBounds: new (bounds: [number, number][]) => LatLngBounds;
    Point: new (x: number, y: number) => Point;
    GeoJSON: new (data: any, opts?: GeoJSONOptions) => GeoJSON;
  }

  const _default: LeafletNamespace;
  export default _default;
}
