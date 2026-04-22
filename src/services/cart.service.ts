import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { SupabaseService } from './supabase.service';

import type { CartProduct } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  // Cart state
  private readonly _items = signal<CartProduct[]>([]);
  readonly items = this._items.asReadonly();

  readonly totalItems = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantity, 0),
  );

  readonly totalPrice = computed(() =>
    this._items().reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  private readonly CART_STORAGE_KEY = 'climbeast_cart';
  private _syncedUserId: string | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCart();
    }

    // Auto-save to localStorage
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(
          this.CART_STORAGE_KEY,
          JSON.stringify(this._items()),
        );
      }
    });

    // Sync with Supabase only once per unique user session (not on every auth event)
    effect(() => {
      const userId = this.supabase.authUserId();
      if (userId && userId !== this._syncedUserId) {
        this._syncedUserId = userId;
        this.syncWithSupabase();
      } else if (!userId && this._syncedUserId) {
        // User logged out: reset flag
        this._syncedUserId = null;
      }
    });
  }

  addItem(product: Omit<CartProduct, 'quantity'>): void {
    const current = this._items();
    const existing = current.find((i) => this.itemsMatch(i, product));

    if (existing) {
      if (product.type === 'area_pack') {
        // Toggle behavior for packs: if already in cart, remove it
        this.removeItem(
          product.id,
          product.type,
          product.selectedSize,
          product.selectedColor,
        );
      } else {
        // Check stock limit before increasing quantity
        const maxStock = existing.maxStock ?? product.maxStock;
        if (maxStock !== undefined && existing.quantity >= maxStock) {
          return;
        }
        this.updateQuantity(
          product.id,
          product.type,
          existing.quantity + 1,
          product.selectedSize,
          product.selectedColor,
        );
      }
    } else {
      // New item: add to local state and persist to DB
      this._items.set([...current, { ...product, quantity: 1 }]);

      const userId = this.supabase.authUserId();
      if (userId) {
        this.saveToSupabase(
          product.id,
          product.type,
          1,
          product.selectedSize,
          product.selectedColor,
        );
      }
    }
  }

  removeItem(
    id: string,
    type: CartProduct['type'],
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    this._items.update((items) =>
      items.filter(
        (i) => !this.itemsMatch(i, { id, type, selectedSize, selectedColor }),
      ),
    );

    const userId = this.supabase.authUserId();
    if (userId) {
      this.removeFromSupabase(id, type, selectedSize, selectedColor);
    }
  }

  updateQuantity(
    id: string,
    type: CartProduct['type'],
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    if (quantity <= 0) {
      this.removeItem(id, type, selectedSize, selectedColor);
      return;
    }

    this._items.update((items) =>
      items.map((i) => {
        if (!this.itemsMatch(i, { id, type, selectedSize, selectedColor }))
          return i;
        const capped =
          i.maxStock !== undefined ? Math.min(quantity, i.maxStock) : quantity;
        return { ...i, quantity: capped };
      }),
    );

    const userId = this.supabase.authUserId();
    if (userId) {
      this.saveToSupabase(id, type, quantity, selectedSize, selectedColor);
    }
  }

  clear(): void {
    this._items.set([]);
    const userId = this.supabase.authUserId();
    if (userId) {
      this.clearSupabase();
    }
  }

  private loadCart(): void {
    const saved = localStorage.getItem(this.CART_STORAGE_KEY);
    if (saved) {
      try {
        this._items.set(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading cart from localStorage', e);
      }
    }
  }

  private async syncWithSupabase(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('cart_items')
      .select('*');

    if (error) {
      console.error('Error syncing cart from Supabase', error);
      return;
    }

    if (data && data.length > 0) {
      const dbItems: CartProduct[] = [];

      // Group IDs by item type
      const merchandiseIds = [
        ...new Set(
          data
            .filter((row) => row.item_type === 'merchandise')
            .map((row) => row.item_id),
        ),
      ];
      const areaPackIds = [
        ...new Set(
          data
            .filter((row) => row.item_type === 'area_pack')
            .map((row) => row.item_id),
        ),
      ];
      const areaIds = [
        ...new Set(
          data
            .filter((row) => row.item_type === 'area')
            .map((row) => parseInt(row.item_id)),
        ),
      ];

      // Batch fetch details
      const [merchandiseRes, areaPacksRes, areasRes] = await Promise.all([
        merchandiseIds.length > 0
          ? this.supabase.client
              .from('merchandise_items')
              .select('id, name, price, image_url, image_urls')
              .in('id', merchandiseIds)
          : Promise.resolve({ data: [] as any[] }),
        areaPackIds.length > 0
          ? this.supabase.client
              .from('area_packs')
              .select('id, name, price, image_url, image_urls')
              .in('id', areaPackIds)
          : Promise.resolve({ data: [] as any[] }),
        areaIds.length > 0
          ? this.supabase.client
              .from('areas')
              .select('id, name, price')
              .in('id', areaIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps
      const merchandiseMap = new Map(
        (merchandiseRes.data || []).map((m) => [m.id, m]),
      );
      const areaPacksMap = new Map(
        (areaPacksRes.data || []).map((p) => [p.id, p]),
      );
      const areasMap = new Map((areasRes.data || []).map((a) => [a.id, a]));

      // Fetch details for each item type to reconstruct full CartProduct
      for (const row of data) {
        let itemDetail: CartProduct | null = null;
        if (row.item_type === 'merchandise') {
          const item = merchandiseMap.get(row.item_id);
          if (item) {
            itemDetail = {
              id: item.id,
              name: item.name,
              price: item.price,
              image_url: item.image_url,
              image_urls: item.image_urls,
              type: 'merchandise',
              quantity: row.quantity ?? 1,
              selectedSize: row.selected_size ?? undefined,
              selectedColor: row.selected_color ?? undefined,
            };
          }
        } else if (row.item_type === 'area_pack') {
          const pack = areaPacksMap.get(row.item_id);
          if (pack) {
            itemDetail = {
              id: pack.id,
              name: pack.name,
              price: pack.price,
              image_url: pack.image_url,
              image_urls: pack.image_urls,
              type: 'area_pack',
              quantity: row.quantity ?? 1,
            };
          }
        } else if (row.item_type === 'area') {
          const area = areasMap.get(parseInt(row.item_id));
          if (area) {
            itemDetail = {
              id: area.id.toString(),
              numericId: area.id,
              name: area.name,
              price: area.price ?? 0,
              image_url: null,
              image_urls: null,
              type: 'area',
              quantity: row.quantity ?? 1,
            };
          }
        }

        if (itemDetail) {
          // Deduplicate: if the DB somehow has duplicate rows, merge them
          const existing = dbItems.find((i) => this.itemsMatch(i, itemDetail!));
          if (existing) {
            // Keep the higher quantity (shouldn't happen with delete+insert, but safe)
            existing.quantity = Math.max(
              existing.quantity,
              itemDetail.quantity,
            );
          } else {
            dbItems.push(itemDetail);
          }
        }
      }

      // DB is the single source of truth: replace local state entirely
      this._items.set(dbItems);
    } else {
      // No items in DB: clear local cart to stay in sync
      this._items.set([]);
    }
  }

  private async saveToSupabase(
    id: string,
    type: string,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    // Upsert with NULL columns is unreliable in Postgres without NULLS NOT DISTINCT.
    // Use delete+insert to guarantee no duplicates.
    let deleteQuery = this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', id)
      .eq('item_type', type);

    if (selectedSize) {
      deleteQuery = deleteQuery.eq('selected_size', selectedSize);
    } else {
      deleteQuery = deleteQuery.is('selected_size', null);
    }
    if (selectedColor) {
      deleteQuery = deleteQuery.eq('selected_color', selectedColor);
    } else {
      deleteQuery = deleteQuery.is('selected_color', null);
    }

    await deleteQuery;

    await this.supabase.client.from('cart_items').insert({
      user_id: userId,
      item_id: id,
      item_type: type,
      quantity,
      selected_size: selectedSize ?? null,
      selected_color: selectedColor ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  private async removeFromSupabase(
    id: string,
    type: string,
    selectedSize?: string,
    selectedColor?: string,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    // .match() with undefined doesn't match NULL in Postgres, so build query explicitly
    let query = this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', id)
      .eq('item_type', type);

    if (selectedSize) {
      query = query.eq('selected_size', selectedSize);
    } else {
      query = query.is('selected_size', null);
    }

    if (selectedColor) {
      query = query.eq('selected_color', selectedColor);
    } else {
      query = query.is('selected_color', null);
    }

    await query;
  }

  private async clearSupabase(): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    await this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
  }

  private itemsMatch(
    a: Pick<CartProduct, 'id' | 'type' | 'selectedSize' | 'selectedColor'>,
    b: Pick<CartProduct, 'id' | 'type' | 'selectedSize' | 'selectedColor'>,
  ): boolean {
    return (
      a.id === b.id &&
      a.type === b.type &&
      (a.selectedSize || undefined) === (b.selectedSize || undefined) &&
      (a.selectedColor || undefined) === (b.selectedColor || undefined)
    );
  }
}
