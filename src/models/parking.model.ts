export interface Parking {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  cragId: string;
  capacity?: number;
}
