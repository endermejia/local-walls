import type { Database } from './supabase-generated';

export type MerchandiseItem =
  Database['public']['Tables']['merchandise_items']['Row'];
export type AreaPack = Database['public']['Tables']['area_packs']['Row'];
export type AreaPackItem =
  Database['public']['Tables']['area_pack_items']['Row'];
export type MerchandisePurchase =
  Database['public']['Tables']['merchandise_purchases']['Row'];
export type AreaPackPurchase =
  Database['public']['Tables']['area_pack_purchases']['Row'];

export interface AreaPackDetail extends AreaPack {
  items?: {
    area_id: number;
    area: {
      id: number;
      name: string;
      slug: string;
      image_url: string | null;
    };
  }[];
  purchased?: boolean;
}
