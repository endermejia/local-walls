import { NewsItem, RouteAscentWithExtras, FeedItem } from '../models';
import { normalizeName } from './index';

/**
 * Marks duplicate ascents in a list by checking the same date and route name.
 */
export function markDuplicateAscents<
  T extends {
    route?: { name?: string };
    date?: string | null;
    is_duplicate?: boolean;
  },
>(ascents: T[]): T[] {
  const seen = new Set<string>();
  return ascents.map((a) => {
    const normalizedNameStr = normalizeName(a.route?.name);
    const key = `${a.date}|${normalizedNameStr}`;
    const isDuplicate = seen.has(key);
    if (!isDuplicate) {
      seen.add(key);
    }
    return { ...a, is_duplicate: isDuplicate };
  });
}

/**
 * Returns a list of year options for filtering ascents, including 'last12' and 'all'.
 */
export function getAscentDateFilterOptions(startingYear = 2020): string[] {
  const years: string[] = [];
  const currentYear = new Date().getFullYear();
  const startYear = Math.min(2020, startingYear);
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y.toString());
  }
  return ['last12', 'all', ...years];
}

/**
 * Helper to process raw ascents into FeedItems.
 */
export function processAscentsToFeed(
  ascents: RouteAscentWithExtras[],
  markDuplicates = true,
): FeedItem[] {
  const list = markDuplicates ? markDuplicateAscents(ascents) : ascents;
  return list.map((i) => ({
    ...i,
    kind: 'ascent' as const,
  }));
}

/**
 * Type guard for NewsItems in a feed.
 */
export function isNewsItem(item: FeedItem): item is NewsItem {
  return item.kind === 'news';
}

/**
 * Type guard for RouteAscentWithExtras in a feed.
 */
export function isAscentItem(
  item: FeedItem,
): item is RouteAscentWithExtras & { kind: 'ascent' } {
  return item.kind === 'ascent';
}
