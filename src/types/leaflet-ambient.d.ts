// Minimal ambient module declaration for Leaflet 2 ESM to satisfy TS in this project.
// We rely on runtime dynamic import and use (L as any) for constructors.
// Narrow types here only for the symbols referenced in type positions.
declare module 'leaflet' {
  export type Map = any;
  export type Marker = any;
  export type Layer = any;
  export type LeafletEvent = any;
  const _default: any;
  export default _default;
}
