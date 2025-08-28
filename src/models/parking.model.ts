export interface Parking {
  id: string;
  name: string;
  ubication: { lat: number; lng: number };
  cragId: string;
  capacity?: number;
}
