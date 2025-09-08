import { Coordinates } from './coordinates.model';

export interface Crag {
  id: string;
  name: string;
  description?: string;
  location: Coordinates;
  parkings: string[]; // parking ids
  approach?: number;
  zoneId: string;
}
