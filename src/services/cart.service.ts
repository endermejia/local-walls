import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

    // Optional: Sync with Supabase if logged in
    effect(() => {
      const user = this.supabase.authUser();
      if (user) {
        this.syncWithSupabase();
      }
    });
  }

  addItem(product: Omit<CartProduct, 'quantity'>): void {
    const current = this._items();
    const existing = current.find(
      (i) =>
        i.id === product.id &&
        i.type === product.type &&
        i.selectedSize === product.selectedSize &&
        i.selectedColor === product.selectedColor,
    );

    if (existing) {
      this.updateQuantity(
        product.id,
        product.type,
        existing.quantity + 1,
        product.selectedSize,
        product.selectedColor,
      );
    } else {
      this._items.set([...current, { ...product, quantity: 1 }]);
    }

    const userId = this.supabase.authUserId();
    if (userId) {
      this.saveToSupabase(
        product.id,
        product.type,
        existing ? existing.quantity + 1 : 1,
        product.selectedSize,
        product.selectedColor,
      );
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
        (i) =>
          !(
            i.id === id &&
            i.type === type &&
            i.selectedSize === selectedSize &&
            i.selectedColor === selectedColor
          ),
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
      items.map((i) =>
        i.id === id &&
        i.type === type &&
        i.selectedSize === selectedSize &&
        i.selectedColor === selectedColor
          ? { ...i, quantity }
          : i,
      ),
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

    // Merge logic could be complex, for now we let localStorage win if it has items,
    // or take Supabase if localStorage is empty.
    if (data && data.length > 0 && this._items().length === 0) {
      // We need to fetch product details to reconstruct CartProduct
      // This is a bit complex without a unified product view.
      // For now, let's keep it simple and just use the DB to store IDs.
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

    await this.supabase.client.from('cart_items').upsert(
      {
        user_id: userId,
        item_id: id,
        item_type: type,
        quantity,
        selected_size: selectedSize,
        selected_color: selectedColor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id,selected_size,selected_color' },
    );
  }

  private async removeFromSupabase(
    id: string,
    type: string,
    selectedSize?: string,
    selectedColor?: string,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    await this.supabase.client.from('cart_items').delete().match({
      user_id: userId,
      item_id: id,
      item_type: type,
      selected_size: selectedSize,
      selected_color: selectedColor,
    });
  }

  private async clearSupabase(): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    await this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
  }
}
