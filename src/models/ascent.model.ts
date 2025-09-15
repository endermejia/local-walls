import type { PageableResponse } from './pagination.model';

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

export type AscentsPage = PageableResponse<AscentListItem>;
