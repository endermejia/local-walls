import { RouteAscentWithExtras } from './route-ascent.model';

export interface NewsItem {
  kind: 'news';
  id: number;
  title: string;
  link: string;
  date: string;
  excerpt: string;
  image?: string;
}

export type FeedItem = (RouteAscentWithExtras & { kind: 'ascent' }) | NewsItem;
