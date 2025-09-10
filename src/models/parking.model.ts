import { Coordinates } from './coordinates.model';

// TODO: Pending AdditionApi
export interface Parking {
  id: string;
  name: string;
  location: Coordinates;
  cragId: string;
  capacity?: number;
}
