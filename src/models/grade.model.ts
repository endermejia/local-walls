// Grade model: enum of French sport grades, type alias from enum values,
// and ordered lists for convenience.
export enum VERTICAL_LIFE_GRADES {
  G0 = 0, // unknown/lowest bucket
  G1 = 1, // 1
  G2 = 2, // 2
  G3a = 3, // 3a
  G3b = 4, // 3b
  G3c = 5, // 3c
  G4a = 6, // 4a
  G4b = 7, // 4b
  G8 = 8, // reserved
  G4c = 9, // 4c
  G5a = 10, // 5a
  G5aPlus = 11, // 5a+
  G5b = 12, // 5b
  G5bPlus = 13, // 5b+
  G5c = 14, // 5c
  G5cPlus = 15, // 5c+
  G6a = 16, // 6a
  G6aPlus = 17, // 6a+
  G6b = 18, // 6b
  G6bPlus = 19, // 6b+
  G20 = 20, // reserved
  G6c = 21, // 6c
  G6cPlus = 22, // 6c+
  G7a = 23, // 7a
  G7aPlus = 24, // 7a+
  G7b = 25, // 7b
  G7bPlus = 26, // 7b+
  G7c = 27, // 7c
  G7cPlus = 28, // 7c+
  G8a = 29, // 8a
  G8aPlus = 30, // 8a+
  G8b = 31, // 8b
  G8bPlus = 32, // 8b+
  G8c = 33, // 8c
  G8cPlus = 34, // 8c+
  G9a = 35, // 9a
  G9aPlus = 36, // 9a+
  G9b = 37, // 9b
  G9bPlus = 38, // 9b+
  G9c = 39, // 9c
}

export type AmountByEveryVerticalLifeGrade = Partial<
  Record<VERTICAL_LIFE_GRADES, number>
>;

export enum GradeEnum {
  ThreeA = '3a',
  ThreeB = '3b',
  ThreeC = '3c',
  FourA = '4a',
  FourB = '4b',
  FourC = '4c',
  Five = '5',
  FiveA = '5a',
  FiveAPlus = '5a+',
  FiveB = '5b',
  FiveBPlus = '5b+',
  FiveC = '5c',
  FiveCPlus = '5c+',
  SixA = '6a',
  SixAPlus = '6a+',
  SixB = '6b',
  SixBPlus = '6b+',
  SixC = '6c',
  SixCPlus = '6c+',
  SevenA = '7a',
  SevenAPlus = '7a+',
  SevenB = '7b',
  SevenBPlus = '7b+',
  SevenC = '7c',
  SevenCPlus = '7c+',
  EightA = '8a',
  EightAPlus = '8a+',
  EightB = '8b',
  EightBPlus = '8b+',
  EightC = '8c',
  EightCPlus = '8c+',
  NineA = '9a',
  NineAPlus = '9a+',
  NineB = '9b',
  NineBPlus = '9b+',
  NineC = '9c',
}

export type GradeLabel = `${GradeEnum}`;

export const ORDERED_GRADE_VALUES: readonly GradeLabel[] = [
  GradeEnum.ThreeA,
  GradeEnum.ThreeB,
  GradeEnum.ThreeC,
  GradeEnum.FourA,
  GradeEnum.FourB,
  GradeEnum.FourC,
  GradeEnum.Five,
  GradeEnum.FiveA,
  GradeEnum.FiveAPlus,
  GradeEnum.FiveB,
  GradeEnum.FiveBPlus,
  GradeEnum.FiveC,
  GradeEnum.FiveCPlus,
  GradeEnum.SixA,
  GradeEnum.SixAPlus,
  GradeEnum.SixB,
  GradeEnum.SixBPlus,
  GradeEnum.SixC,
  GradeEnum.SixCPlus,
  GradeEnum.SevenA,
  GradeEnum.SevenAPlus,
  GradeEnum.SevenB,
  GradeEnum.SevenBPlus,
  GradeEnum.SevenC,
  GradeEnum.SevenCPlus,
  GradeEnum.EightA,
  GradeEnum.EightAPlus,
  GradeEnum.EightB,
  GradeEnum.EightBPlus,
  GradeEnum.EightC,
  GradeEnum.EightCPlus,
  GradeEnum.NineA,
  GradeEnum.NineAPlus,
  GradeEnum.NineB,
  GradeEnum.NineBPlus,
  GradeEnum.NineC,
] as const;

export type RoutesByGrade = Partial<Record<GradeLabel, number>>;
