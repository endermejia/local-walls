export interface Crag {
  id: string;
  name: string;
  description?: string;
  location: { lat: number; lng: number };
  parkings: string[]; // parking ids
  approach?: number;
  zoneId: string;
}
