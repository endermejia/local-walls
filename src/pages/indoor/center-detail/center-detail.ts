import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiTabs, TuiCarousel } from '@taiga-ui/kit';
import { PhotoViewerDialogComponent } from '../../../components/dialogs/photo-viewer-dialog';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { IndoorVoucherCardComponent, VoucherPurchaseItem } from '../components/indoor-voucher-card';
import { IndoorStoreItemComponent, VoucherItem } from '../components/indoor-store-item';
import { TuiAlertService } from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';

import { GlobalData } from '../../../services/global-data';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-center-detail',
  standalone: true,
  imports: [TranslatePipe, TuiButton, TuiIcon, TuiTabs, RouterLink, TuiCarousel, TuiPagination, IndoorVoucherCardComponent, IndoorStoreItemComponent],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center p-8">
        <tui-icon icon="@tui.loader" class="text-4xl animate-spin text-(--tui-text-tertiary)" />
      </div>
    } @else if (center()) {
      @let c = center()!;
      <div class="flex flex-col w-full max-w-5xl mx-auto pb-20">
        <!-- Header -->
        <div class="relative w-full h-48 md:h-64 bg-(--tui-background-elevation-2) group">
          @if (c.gallery_urls && c.gallery_urls.length > 0) {
            <tui-carousel
              class="w-full h-full"
              [itemsCount]="1"
              [(index)]="galleryIndex"
            >
              @for (img of c.gallery_urls; track img; let i = $index) {
                <div *tuiItem class="w-full h-full cursor-pointer" (click)="openImageGallery(c.gallery_urls, i)">
                  <img [src]="img" alt="Gallery image" class="w-full h-full object-cover" />
                </div>
              }
            </tui-carousel>

            @if (c.gallery_urls.length > 1) {
              <div class="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
                <tui-pagination
                  size="s"
                  class="text-white"
                  [length]="c.gallery_urls.length"
                  [(index)]="galleryIndex"
                />
              </div>
            }
          } @else {
            <div class="w-full h-full flex items-center justify-center opacity-50">
              <tui-icon icon="@tui.image" class="text-6xl text-(--tui-text-tertiary)" />
            </div>
          }

          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

          <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-4">
            @if (c.avatar_url) {
              <img [src]="c.avatar_url" alt="Avatar" class="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-black/20" />
            } @else {
              <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-(--tui-background-elevation-1) flex items-center justify-center border-4 border-black/20">
                <tui-icon icon="@tui.home" class="text-3xl text-(--tui-text-tertiary)" />
              </div>
            }
            <div class="flex-1 pb-1">
              <h1 class="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{{ c.name }}</h1>
              @if (c.city || c.country) {
                <div class="flex items-center gap-1 text-white/80 text-sm md:text-base drop-shadow-sm">
                  <tui-icon icon="@tui.map-pin" class="text-sm" />
                  <span>{{ c.city }}{{ c.city && c.country ? ', ' : '' }}{{ c.country }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="sticky top-0 z-20 bg-(--tui-background-base) border-b border-(--tui-border-normal) overflow-x-auto no-scrollbar">
          <tui-tabs [(activeItemIndex)]="activeTabIndex" class="px-2 md:px-6 w-max min-w-full">
            <button tuiTab>
              <tui-icon icon="@tui.info" class="mr-2" />
              {{ 'overview' | translate }}
            </button>
            <button tuiTab>
              <tui-icon icon="@tui.route" class="mr-2" />
              {{ 'routes' | translate }}
            </button>
            <button tuiTab>
              <tui-icon icon="@tui.history" class="mr-2" />
              {{ 'ascents' | translate }}
            </button>
            <button tuiTab>
              <tui-icon icon="@tui.shopping-cart" class="mr-2" />
              {{ 'store' | translate }}
            </button>
          </tui-tabs>
        </div>

        <!-- Tab Content -->
        <div class="p-4 md:p-6">
          @switch (activeTabIndex()) {
            @case (0) {
              <!-- Overview Tab -->
              <div class="flex flex-col gap-6">
                @if (userVouchers().length > 0) {
                  <section>
                    <h2 class="text-xl font-bold mb-4">{{ 'myActiveVouchers' | translate }}</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (v of userVouchers(); track v.id) {
                        <app-indoor-voucher-card [purchase]="v" />
                      }
                    </div>
                  </section>
                }

                @if (c.description) {
                  <section>
                    <h2 class="text-xl font-bold mb-2">{{ 'description' | translate }}</h2>
                    <p class="text-(--tui-text-secondary) whitespace-pre-line">{{ c.description }}</p>
                  </section>
                }

                @if (c.schedules) {
                  <section>
                    <h2 class="text-xl font-bold mb-2">{{ 'schedule' | translate }}</h2>
                    <!-- TODO: Parse and display schedule JSONB properly -->
                    <div class="p-4 rounded-2xl bg-(--tui-background-elevation-1) border border-(--tui-border-normal)">
                      <pre class="text-xs text-(--tui-text-secondary) overflow-x-auto">{{ c.schedules | json }}</pre>
                    </div>
                  </section>
                }
              </div>
            }
            @case (1) {
              <div class="text-center py-10 text-(--tui-text-secondary)">
                {{ 'comingSoon' | translate }}
              </div>
            }
            @case (2) {
              <div class="text-center py-10 text-(--tui-text-secondary)">
                {{ 'comingSoon' | translate }}
              </div>
            }
            @case (3) {
              <div class="flex flex-col gap-4">
                <h2 class="text-xl font-bold mb-2">{{ 'store' | translate }}</h2>
                @if (storeVouchers().length > 0) {
                  <div class="flex flex-col gap-3">
                    @for (v of storeVouchers(); track v.id) {
                      <app-indoor-store-item [voucher]="v" (buy)="onBuyVoucher($event)" />
                    }
                  </div>
                } @else {
                  <div class="p-8 text-center text-(--tui-text-secondary) bg-(--tui-background-elevation-1) rounded-2xl border border-(--tui-border-normal)">
                    <tui-icon icon="@tui.shopping-bag" class="text-4xl mb-2 opacity-50" />
                    <p>{{ 'noVouchersAvailable' | translate }}</p>
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <tui-icon icon="@tui.alert-circle" class="text-4xl text-(--tui-text-tertiary) mb-4" />
        <h2 class="text-xl font-bold mb-2">{{ 'error' | translate }}</h2>
        <p class="text-(--tui-text-secondary) mb-4">{{ 'centerNotFound' | translate }}</p>
        <button tuiButton routerLink="/explore">{{ 'backToMap' | translate }}</button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorCenterDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);

  activeTabIndex = signal(0);
  galleryIndex = 0;
  loading = signal(true);
  center = signal<any>(null); // TODO: Type this properly
  userVouchers = signal<VoucherPurchaseItem[]>([]);
  storeVouchers = signal<VoucherItem[]>([]);

  constructor() {
    effect(() => {
      const slug = this.route.snapshot.paramMap.get('slug');
      if (slug && isPlatformBrowser(this.platformId)) {
        this.loadCenter(slug);
      } else {
        this.loading.set(false);
      }
    });
  }


  private async loadUserVouchers(centerId: string) {
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_voucher_purchases')
        .select(`
          id,
          expiration_date,
          remaining_sessions,
          status,
          voucher:indoor_vouchers!inner(name, sessions_count, center_id)
        `)
        .eq('user_id', this.global.userProfile()?.id)
        .eq('status', 'active')
        .eq('voucher.center_id', centerId);

      if (data && !error) {
        this.userVouchers.set(data as any); // Cast for now
      }
    } catch (e) {
      console.error(e);
    }
  }


  private async loadStoreVouchers(centerId: string) {
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_vouchers')
        .select('*')
        .eq('center_id', centerId)
        .eq('active', true)
        .order('price', { ascending: true });

      if (data && !error) {
        this.storeVouchers.set(data as any);
      }
    } catch (e) {
      console.error(e);
    }
  }

  onBuyVoucher(voucher: VoucherItem) {
    // In a real implementation, this would redirect to Stripe checkout
    // For now, we'll just mock the purchase and alert the user
    this.alerts.open('Stripe Checkout Mock: ' + voucher.name, { status: 'success' }).subscribe();
  }

  openImageGallery(urls: string[], index: number) {
    this.dialogs
      .open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
        data: {
          photos: urls.map(url => ({ image_url: url })),
          initialIndex: index,
        },
        appearance: 'fullscreen',
        dismissible: true,
      })
      .subscribe();
  }

  private async loadCenter(slug: string) {
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data && !error) {
        this.center.set(data);
        if (this.global.userProfile()) {
          this.loadUserVouchers(data.id);
        }
        this.loadStoreVouchers(data.id);
      } else {
        console.error('Error fetching indoor center', error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
