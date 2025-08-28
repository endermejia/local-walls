export interface User {
  id: string;
  name: string;
  picture: string;
  likedRoutes: string[];
  likedCrags: string[];
  likedZones: string[];
  likedTopos?: string[];
  ascents?: string[]; // ascent ids
}
