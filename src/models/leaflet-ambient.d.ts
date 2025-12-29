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
    latlng?: LatLng;
  }

  export interface Layer {
    addTo(map: Map): this;
    remove(): this;
    on(event: string, handler: (e: LeafletEvent) => void): this;
  }

  export type Icon = object;
  export interface DivIconOptions {
    html?: string;
    className?: string;
    iconSize?: [number, number] | Point;
    iconAnchor?: [number, number] | Point;
  }
  export type DivIcon = Icon;

  export interface Marker extends Layer {
    getLatLng(): LatLng;
    setIcon(icon: Icon): this;
    getElement(): HTMLElement | null;
  }
  export type TileLayer = Layer;

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
    setZoom(z: number, options?: { animate?: boolean }): this;
    zoomIn(options?: { animate?: boolean }): this;
    zoomOut(options?: { animate?: boolean }): this;
    on(event: string, handler: (e: LeafletEvent) => void): this;
    panTo(latlng: LatLng): this;
    setView(
      center: [number, number] | LatLng,
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
    filter?(f: object): boolean;
    pointToLayer?(feature: object, latlng: LatLng): Layer;
  }
  export type GeoJSON = Layer;

  export interface LeafletNamespace {
    Map: new (el: string | HTMLElement, opts?: object) => Map;
    TileLayer: new (url: string, opts?: object) => TileLayer;
    Marker: new (latlng: LatLng | [number, number], opts?: object) => Marker;
    DivIcon: new (opts?: DivIconOptions) => DivIcon;
    LatLng: new (lat: number, lng: number) => LatLng;
    LatLngBounds: new (bounds: [number, number][]) => LatLngBounds;
    Point: new (x: number, y: number) => Point;
    GeoJSON: new (data: object, opts?: GeoJSONOptions) => GeoJSON;
  }

  const _default: LeafletNamespace;
  export default _default;
}
