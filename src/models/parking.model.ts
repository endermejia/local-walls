import { Coordinates } from './coordinates.model';

export interface Parking {
  id: string;
  name: string;
  location: Coordinates;
  cragId: string;
  capacity?: number;
}
