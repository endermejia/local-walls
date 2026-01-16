export interface EightAnuUser {
  uuid: string;
  userName: string;
  userSlug: string;
  firstName: string;
  lastName: string;
  avatar: string;
  countrySlug: string;
  countryName: string;
  city: string | null;
  birthday: string | null;
  rank: number;
  totalScore: number;
  ascentsAmount: number;
  type: number;
  score: number;
}

export interface EightAnuSearchResponse {
  items: EightAnuUser[];
  totals: number;
  totalAreas: number;
  totalCrags: number;
  totalSectors: number;
  totalZlaggables: number;
  totalUsers: number;
}
