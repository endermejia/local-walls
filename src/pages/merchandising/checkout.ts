import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { TuiDataListWrapper, TuiSelect, TuiChevron } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiButton,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
  TuiLabel,
  TuiDropdown,
  TuiIcon,
  TuiInput,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../services/cart.service';
import { CheckoutService } from '../../services/checkout.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiChevron,
    TuiDataListWrapper,
    TuiDropdown,
    TuiHeader,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiNotification,
    TuiScrollbar,
    TuiSelect,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="max-w-4xl mx-auto w-full py-16 px-4 md:px-8">
        <!-- Sticky Header -->
        <header
          tuiHeader
          class="sticky top-0 z-10 flex items-center gap-4 py-4 mb-4 bg-(--tui-background-base)"
        >
          <h1 tuiTitle class="m-0">
            <button
              type="button"
              class="no-underline text-inherit flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-left outline-none text-2xl font-black"
              (click)="goBack()"
            >
              <tui-icon icon="@tui.arrow-left" />
              {{ 'merchandising.checkout.title' | translate }}
            </button>
          </h1>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mt-6">
          <!-- Shipping Form -->
          <div class="md:col-span-7">
            <form
              [formGroup]="shippingForm"
              (ngSubmit)="onSubmit()"
              class="flex flex-col gap-6"
            >
              <section class="flex flex-col gap-4">
                <h2 tuiTitle="m">
                  {{ 'merchandising.checkout.shippingInfo' | translate }}
                </h2>

                <tui-textfield class="w-full">
                  <label tuiLabel for="nameInput">{{
                    'merchandising.checkout.name' | translate
                  }}</label>
                  <input
                    id="nameInput"
                    tuiInput
                    placeholder="John Doe"
                    formControlName="name"
                  />
                </tui-textfield>

                <tui-textfield class="w-full">
                  <label tuiLabel for="emailInput">{{
                    'merchandising.checkout.email' | translate
                  }}</label>
                  <input
                    id="emailInput"
                    tuiInput
                    placeholder="john@example.com"
                    type="text"
                    inputmode="email"
                    formControlName="email"
                  />
                </tui-textfield>

                <tui-textfield class="w-full">
                  <label tuiLabel for="phoneInput">{{
                    'merchandising.checkout.phone' | translate
                  }}</label>
                  <input
                    id="phoneInput"
                    tuiInput
                    placeholder="+34 600 000 000"
                    type="tel"
                    formControlName="phone"
                  />
                </tui-textfield>

                <tui-textfield class="w-full">
                  <label tuiLabel for="addressInput">{{
                    'merchandising.checkout.address' | translate
                  }}</label>
                  <input
                    id="addressInput"
                    tuiInput
                    placeholder="Street 123"
                    formControlName="address"
                  />
                </tui-textfield>

                <div class="grid grid-cols-2 gap-4">
                  <tui-textfield class="w-full">
                    <label tuiLabel for="cityInput">{{
                      'merchandising.checkout.city' | translate
                    }}</label>
                    <input
                      id="cityInput"
                      tuiInput
                      placeholder="Madrid"
                      formControlName="city"
                    />
                  </tui-textfield>
                  <tui-textfield class="w-full">
                    <label tuiLabel for="zipInput">{{
                      'merchandising.checkout.zip' | translate
                    }}</label>
                    <input
                      id="zipInput"
                      tuiInput
                      placeholder="28001"
                      formControlName="zip"
                    />
                  </tui-textfield>
                </div>

                <tui-textfield tuiChevron class="w-full">
                  <label tuiLabel for="countrySelect">{{
                    'merchandising.checkout.country' | translate
                  }}</label>
                  <input
                    id="countrySelect"
                    tuiSelect
                    formControlName="country"
                  />
                  <tui-data-list-wrapper *tuiDropdown new [items]="countries" />
                </tui-textfield>
              </section>

              @if (error()) {
                <div tuiNotification appearance="negative" class="mt-4">
                  {{ 'merchandising.checkout.error' | translate }}:
                  {{ error() }}
                </div>
              }

              <button
                tuiButton
                type="submit"
                class="w-full mt-6"
                size="l"
                [disabled]="shippingForm.invalid || loading()"
              >
                {{ 'merchandising.checkout.goToPayment' | translate }}
              </button>
            </form>
          </div>

          <!-- Order Summary -->
          <div class="md:col-span-5">
            <div
              class="bg-(--tui-background-neutral-1) rounded-3xl p-8 sticky top-8 border border-(--tui-border-normal)"
            >
              <h2 tuiTitle="m" class="mb-6!">
                {{ 'merchandising.checkout.summary' | translate }}
              </h2>

              <div class="flex flex-col gap-4 mb-8">
                @for (item of items(); track item.id + item.type) {
                  <div class="flex justify-between items-center text-sm">
                    <div class="flex gap-3 items-center min-w-0">
                      <span
                        class="w-6 h-6 flex items-center justify-center bg-(--tui-background-neutral-2) rounded text-[10px] font-bold"
                        >{{ item.quantity }}x</span
                      >
                      <span class="truncate text-(--tui-text-secondary)">{{
                        item.name
                      }}</span>
                    </div>
                    <span class="font-medium whitespace-nowrap">{{
                      item.price * item.quantity | currency: 'EUR'
                    }}</span>
                  </div>
                }
              </div>

              <div
                class="flex flex-col gap-2 pt-6 border-t border-(--tui-border-normal)"
              >
                <div
                  class="flex justify-between items-center text-(--tui-text-secondary) text-sm"
                >
                  <span>{{
                    'merchandising.checkout.subtotal' | translate
                  }}</span>
                  <span>{{ subtotal() | currency: 'EUR' }}</span>
                </div>
                <div
                  class="flex justify-between items-center text-(--tui-text-secondary) text-sm"
                >
                  <span>{{
                    'merchandising.checkout.shipping' | translate
                  }}</span>
                  <span class="text-(--tui-status-positive) font-medium">{{
                    'merchandising.checkout.free' | translate
                  }}</span>
                </div>
                <div
                  class="flex justify-between items-center mt-4 text-2xl font-black"
                >
                  <span>{{ 'merchandising.checkout.total' | translate }}</span>
                  <span>{{ total() | currency: 'EUR' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </tui-scrollbar>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cart = inject(CartService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private formSub?: Subscription;

  protected readonly items = this.cart.items;
  protected readonly subtotal = this.cart.totalPrice;
  protected readonly total = this.cart.totalPrice;
  protected readonly loading = this.checkoutService.loading;
  protected readonly error = this.checkoutService.error;

  protected readonly countries = ['España'];

  protected readonly shippingForm = this.fb.group({
    name: ['', [Validators.required]],
    email: [
      { value: this.supabase.authUser()?.email ?? '', disabled: true },
      [Validators.required, Validators.email],
    ],
    phone: ['', [Validators.required]],
    address: ['', [Validators.required]],
    city: ['', [Validators.required]],
    zip: ['', [Validators.required]],
    country: [{ value: 'España', disabled: true }, [Validators.required]],
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const savedInfo = localStorage.getItem('checkout_shipping_info');
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          // Only patch fields we want to restore, don't override the disabled email or country
          this.shippingForm.patchValue({
            name: parsed.name,
            phone: parsed.phone,
            address: parsed.address,
            city: parsed.city,
            zip: parsed.zip,
          });
        } catch (e) {
          console.error('Failed to parse checkout shipping info', e);
        }
      }

      this.formSub = this.shippingForm.valueChanges.subscribe((val) => {
        localStorage.setItem('checkout_shipping_info', JSON.stringify(val));
      });
    }
  }

  ngOnDestroy() {
    this.formSub?.unsubscribe();
  }

  async onSubmit(): Promise<void> {
    if (this.shippingForm.invalid) return;

    await this.checkoutService.startStripeCheckout(
      this.shippingForm.getRawValue(),
    );
  }

  goBack(): void {
    this.router.navigate(['/merchandising']);
  }
}
