import { Database } from './supabase-generated';

export type AscentType = Database['public']['Enums']['ascent_type'];
export const AscentTypes = {
  OS: 'os',
  RP: 'rp',
  F: 'f',
  ATTEMPT: 'attempt',
} as const;

export type ClimbingKind = Database['public']['Enums']['climbing_kind'];
export const ClimbingKinds = {
  SPORT: 'sport',
  BOULDER: 'boulder',
  TRAD: 'trad',
  MULTIPITCH: 'multipitch',
  MIXED: 'mixed',
} as const;

export const CLIMBING_ICONS: Record<ClimbingKind, string> = {
  sport: '@tui.mountain',
  boulder: '@tui.mountain',
  trad: '@tui.mountain',
  multipitch: '@tui.mountain',
  mixed: '@tui.mountain',
};

export type Language = Database['public']['Enums']['language'];
export const Languages = {
  ES: 'es',
  EN: 'en',
  VA: 'va',
  DE: 'de',
  EU: 'eu',
  FR: 'fr',
  IT: 'it',
} as const;

export type Theme = Database['public']['Enums']['theme'] | 'system';
export const Themes = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
} as const;

export type Sex = Database['public']['Enums']['sex'];
export const Sexes = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
