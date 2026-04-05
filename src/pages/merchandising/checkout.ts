import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  TuiButton,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
  TuiTextfield,
  TuiLabel,
} from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { CartService } from '../../services/cart.service';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiNotification,
    TuiScrollbar,
    TuiTitle,
    TranslatePipe,
    TuiTextfield,
    TuiLabel,
    TuiSelect,
    TuiChevron,
    TuiDataListWrapper,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="max-w-4xl mx-auto w-full py-16 px-4 md:px-8">
        <h1 tuiTitle="l" class="mb-10 text-4xl font-black">
          {{ 'merchandising.checkout.title' | translate }}
        </h1>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-12">
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
                    tuiTextfield
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
                    tuiTextfield
                    placeholder="john@example.com"
                    type="email"
                    formControlName="email"
                  />
                </tui-textfield>

                <tui-textfield class="w-full">
                  <label tuiLabel for="addressInput">{{
                    'merchandising.checkout.address' | translate
                  }}</label>
                  <input
                    id="addressInput"
                    tuiTextfield
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
                      tuiTextfield
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
                      tuiTextfield
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
                  <tui-data-list-wrapper
                    *tuiTextfieldDropdown
                    new
                    [items]="countries"
                  />
                </tui-textfield>
              </section>

              @if (error()) {
                <tui-notification appearance="error" class="mt-4">
                  {{ 'merchandising.checkout.error' | translate }}:
                  {{ error() }}
                </tui-notification>
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
              class="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-8 sticky top-8 border border-zinc-200 dark:border-zinc-800"
            >
              <h2 tuiTitle="m" class="mb-6">
                {{ 'merchandising.checkout.summary' | translate }}
              </h2>

              <div class="flex flex-col gap-4 mb-8">
                @for (item of items(); track item.id + item.type) {
                  <div class="flex justify-between items-center text-sm">
                    <div class="flex gap-3 items-center min-w-0">
                      <span
                        class="w-6 h-6 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-bold"
                        >{{ item.quantity }}x</span
                      >
                      <span class="truncate text-zinc-600 dark:text-zinc-400">{{
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
                class="flex flex-col gap-2 pt-6 border-t dark:border-zinc-800"
              >
                <div
                  class="flex justify-between items-center text-zinc-500 text-sm"
                >
                  <span>{{
                    'merchandising.checkout.subtotal' | translate
                  }}</span>
                  <span>{{ subtotal() | currency: 'EUR' }}</span>
                </div>
                <div
                  class="flex justify-between items-center text-zinc-500 text-sm"
                >
                  <span>{{
                    'merchandising.checkout.shipping' | translate
                  }}</span>
                  <span class="text-green-600 font-medium">{{
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
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cart = inject(CartService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  protected readonly items = this.cart.items;
  protected readonly subtotal = this.cart.totalPrice;
  protected readonly total = this.cart.totalPrice;
  protected readonly loading = this.checkoutService.loading;
  protected readonly error = this.checkoutService.error;

  protected readonly countries = [
    'Spain',
    'France',
    'Germany',
    'USA',
    'United Kingdom',
  ];

  protected readonly shippingForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required]],
    city: ['', [Validators.required]],
    zip: ['', [Validators.required]],
    country: ['Spain', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.shippingForm.invalid) return;

    await this.checkoutService.startStripeCheckout(this.shippingForm.value);
  }
}
