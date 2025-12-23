export interface AscentListItem {
  ascentId: number;
  platform: 'eight_a' | string;
  userAvatar: string | null;
  userName: string | null;
  userSlug: string | null;
  date: string; // ISO string
  difficulty: string | null;
  comment: string | null;
  userPrivate: boolean;
  countrySlug: string;
  countryName: string;
  areaSlug: string;
  areaName: string;
  sectorSlug: string | null;
  sectorName: string | null;
  traditional: boolean;
  firstAscent: boolean;
  chipped: boolean;
  withKneepad: boolean;
  badAnchor: boolean;
  badBolts: boolean;
  highFirstBolt: boolean;
  looseRock: boolean;
  badClippingPosition: boolean;
  isHard: boolean;
  isSoft: boolean;
  isBoltedByMe: boolean;
  isOverhang: boolean;
  isVertical: boolean;
  isSlab: boolean;
  isRoof: boolean;
  isAthletic: boolean;
  isEndurance: boolean;
  isCrimpy: boolean;
  isCruxy: boolean;
  isSloper: boolean;
  isTechnical: boolean;
  type: 'os' | 'rp' | 'f' | string; // onsight, redpoint, flash, etc.
  repeat: boolean;
  project: boolean;
  rating: number;
  category: number;
  recommended: boolean;
  secondGo: boolean;
  duplicate: boolean;
  isDanger: boolean;
  zlagGradeIndex: number | null;
  zlaggableName: string;
  zlaggableSlug: string;
  cragSlug: string;
  cragName: string;
}

export interface AscentsQuery {
  sectorSlug?: string;
  pageIndex?: number;
  pageSize?: number;
  grade?: string;
  searchQuery?: string;
}

// Response shape for user ascents endpoint (different from pageable items)
export interface UserAscentsResponse {
  ascents: AscentListItem[];
  totalItems: number;
  pageIndex: number;
}

export interface UserAscentsQuery {
  category?: 'sportclimbing' | 'bouldering' | 'alpine' | string; // defaults to sportclimbing
  pageIndex?: number;
  pageSize?: number;
  sortField?: 'grade_desc' | 'date_desc' | 'date_asc' | string;
  timeFilter?: number; // 0 = all time
  gradeFilter?: number; // 0 = all
  typeFilter?: string | null; // e.g. os/rp/f
  includeProjects?: boolean;
  searchQuery?: string | null;
  showRepeats?: boolean;
  showDuplicates?: boolean;
}
