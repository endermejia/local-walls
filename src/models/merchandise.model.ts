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
  items: {
    area_id: number;
    area: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
}

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type MerchandiseStock =
  Database['public']['Tables']['merchandise_stock']['Row'];

export interface OrderDetail extends Order {
  items: (OrderItem & {
    product_name?: string;
    product_image?: string;
    product_slug?: string;
    product_data?: MerchandiseItemDetail | AreaPackDetail;
  })[];
}

export type CartItemRecord = Database['public']['Tables']['cart_items']['Row'];

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  image_urls: string[] | null;
  type: 'merchandise' | 'area_pack' | 'area';
  quantity: number;
  numericId?: number; // Used for areas (int)
  selectedSize?: string;
  selectedColor?: string;
  maxStock?: number; // Max units allowed (merchandise with stock control)
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface MerchandiseItemDetail extends MerchandiseItem {
  stock?: MerchandiseStock[];
}
