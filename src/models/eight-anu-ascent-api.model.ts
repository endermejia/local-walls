import { GradeLabel } from './grade.model';

export interface EightAnuAscentListItem {
  ascentId: number;
  platform: string;
  userAvatar: string;
  userName: string;
  userSlug: string;
  date: string;
  difficulty: GradeLabel;
  comment: string;
  userPrivate: boolean;
  countrySlug: string;
  countryName: string;
  areaSlug: string;
  areaName: string;
  sectorSlug: string;
  sectorName: string;
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
  type: 'rp' | 'os' | 'f';
  repeat: boolean;
  project: boolean;
  rating: number;
  category: number;
  recommended: boolean;
  secondGo: boolean;
  duplicate: boolean;
  isDanger: boolean;
  zlagGradeIndex: number;
  zlaggableName: string;
  zlaggableSlug: string;
  cragSlug: string;
  cragName: string;
}

export interface EightAnuAscentsResponse {
  items: EightAnuAscentListItem[];
  pagination: {
    pageSize: number;
    totalItems: number;
    itemsOnPage: number;
    pageCount: number;
    hasNext: boolean;
    pageIndex: number;
  };
}
