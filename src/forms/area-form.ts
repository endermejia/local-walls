import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit } from '@angular/forms/signals';

import { TuiInputChip, TuiCheckbox, TuiInputNumber } from '@taiga-ui/kit';
import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../services/areas.service';
import { GlobalData } from '../services/global-data';
import { ToastService } from '../services/toast.service';

import { handleErrorToast, slugify } from '../utils';
import { CounterComponent } from '../components/counter';

@Component({
  selector: 'app-area-form',
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    TuiButton,
    TuiError,
    TuiLabel,
    TuiTextfield,
    TuiInputChip,
    TuiCheckbox,
    TuiInputNumber,
    TranslatePipe,
    CounterComponent,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield class="block">
        <label tuiLabel for="area-name">{{ 'name' | translate }}</label>
        <input
          tuiTextfield
          id="area-name"
          [formField]="areaForm.name"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>
      @if (areaForm.name().invalid() && areaForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      @if (isEdit()) {
        <tui-textfield class="block">
          <label tuiLabel for="area-slug">{{ 'slug' | translate }}</label>
          <input
            tuiTextfield
            id="area-slug"
            [formField]="areaForm.slug"
            type="text"
            autocomplete="off"
          />
        </tui-textfield>
        @if (areaForm.slug().invalid() && areaForm.slug().touched()) {
          <tui-error [error]="'errors.required' | translate" />
        }

        <tui-textfield multi class="block">
          <label tuiLabel for="eight-anu-slugs">
            {{ 'import8a.slugs' | translate }}
          </label>
          <input
            tuiInputChip
            id="eight-anu-slugs"
            [ngModel]="model().eight_anu_crag_slugs"
            (ngModelChange)="onSlugsChange($event)"
            name="eight_anu_crag_slugs"
            autocomplete="off"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>
      }

      <!-- Payments Section -->
      @if (canEditPayments()) {
        <div class="border-t pt-4 mt-2">
          <h3 class="font-bold text-lg mb-2">
            {{ 'payments.title' | translate }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div class="flex flex-col gap-4">
              <label tuiLabel class="flex items-center gap-2 cursor-pointer">
                <input
                  tuiCheckbox
                  type="checkbox"
                  [ngModel]="model().is_public"
                  (ngModelChange)="onIsPublicChange($event)"
                  name="is_public"
                />
                {{ 'payments.isPublic' | translate }}
              </label>

              <app-counter
                label="payments.price"
                suffix="€"
                [step]="0.5"
                [ngModel]="model().price"
                (ngModelChange)="onPriceChange($event)"
                name="price"
                [hidden]="model().is_public"
              />

              <tui-textfield
                [tuiTextfieldCleaner]="false"
                [hidden]="model().is_public"
              >
                <label tuiLabel for="stripe-id">{{
                  'payments.stripeAccountId' | translate
                }}</label>
                <input
                  tuiTextfield
                  id="stripe-id"
                  [ngModel]="model().stripe_account_id"
                  (ngModelChange)="onStripeAccountChange($event)"
                  name="stripe_account_id"
                  placeholder="acct_..."
                  autocomplete="off"
                />
              </tui-textfield>
            </div>

            <div
              class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm"
              [hidden]="model().is_public"
            >
              <h4 class="font-bold mb-2">
                {{ 'payments.tutorial.title' | translate }}
              </h4>
              <ol class="list-decimal list-inside space-y-1">
                <li>
                  {{ 'payments.tutorial.step1' | translate }}
                  <a
                    href="https://dashboard.stripe.com/register"
                    target="_blank"
                    class="text-blue-500 underline"
                    >Stripe</a
                  >
                </li>
                <li>{{ 'payments.tutorial.step2' | translate }}</li>
                <li>{{ 'payments.tutorial.step3' | translate }}</li>
                <li>{{ 'payments.tutorial.step4' | translate }}</li>
              </ol>
              <p class="mt-2 text-xs text-gray-500">
                {{ 'payments.tutorial.footer' | translate }}
              </p>
            </div>
          </div>
        </div>
      }

      <div class="flex flex-wrap gap-2 justify-end">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="
            areaForm.name().invalid() || (isEdit() && areaForm.slug().invalid())
          "
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'save' : 'create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class AreaFormComponent {
  private readonly areas = inject(AreasService);
  private readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { areaData?: { id: number; name: string; slug: string } }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { areaData?: { id: number; name: string; slug: string } }
        >
      >();
    } catch {
      return null;
    }
  })();

  // When using as a routed/page component, an input can provide the area data for editing
  areaData: InputSignal<
    { id: number; name: string; slug: string } | undefined
  > = input<{ id: number; name: string; slug: string } | undefined>(undefined);

  // Area data when opened as a dialog
  private readonly dialogAreaData:
    | { id: number; name: string; slug: string }
    | undefined = this._dialogCtx?.data?.areaData;

  private readonly effectiveAreaData: Signal<
    { id: number; name: string; slug: string } | undefined
  > = computed(() => this.dialogAreaData ?? this.areaData());

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveAreaData());

  readonly canEditPayments: Signal<boolean> = computed(() => {
    const isAdmin = this.global.canEditAsAdmin() || this.global.isAdmin();
    const areaId = this.editingId;
    const isAreaAdmin = areaId
      ? !!this.global.areaAdminPermissions()[areaId]
      : false;
    return isAdmin || isAreaAdmin;
  });

  model = signal<{
    name: string;
    slug: string;
    eight_anu_crag_slugs: string[];
    is_public: boolean;
    price: number;
    stripe_account_id: string | null;
  }>({
    name: '',
    slug: '',
    eight_anu_crag_slugs: [],
    is_public: true,
    price: 0,
    stripe_account_id: null,
  });

  areaForm = form(this.model, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.slug, {
      when: () => this.isEdit(),
    });
  });

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, prefill the form with provided data
    effect(() => {
      const data = this.effectiveAreaData();
      if (!data) return;
      this.editingId = data.id;
      this.model.update((m) => ({
        ...m,
        name: data.name,
        slug: data.slug,
        is_public: true, // Default
        price: 0,
        stripe_account_id: null,
      }));

      // Fetch full data to get eight_anu_crag_slugs if not provided in dialog data
      this.fetchFullAreaData(data.id);
    });
  }

  private async fetchFullAreaData(id: number) {
    const { data, error } = await this.areas.getById(id);
    if (data && !error) {
      this.model.update((m) => ({
        ...m,
        eight_anu_crag_slugs: data.eight_anu_crag_slugs || [],
        is_public: data.is_public ?? true,
        price: data.price ?? 0,
        stripe_account_id: data.stripe_account_id ?? null,
      }));
      this.areaForm().reset();
    }
  }

  async onSubmit(event?: Event): Promise<void> {
    // Prevent native form submission when using (submit) instead of (ngSubmit)
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.areaForm, async () => {
      const { name, slug, eight_anu_crag_slugs } = this.model();
      const payload = this.isEdit()
        ? {
            name,
            slug,
            eight_anu_crag_slugs,
            is_public: this.model().is_public,
            price: this.model().price,
            stripe_account_id: this.model().stripe_account_id,
          }
        : { name, slug: slugify(name) };
      try {
        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.areas.update(this.editingId, payload);
        } else {
          await this.areas.create(payload as { name: string; slug: string });
        }
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(this.isEdit() ? (slug ?? true) : true);
        } else {
          this.goBack();
        }
      } catch (e) {
        const error = e as Error;
        console.error('[AreaFormComponent] Error submitting area:', e);
        handleErrorToast(error, this.toast);
      }
    });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  onSlugsChange(slugs: string[]): void {
    this.model.update((m) => ({ ...m, eight_anu_crag_slugs: slugs }));
  }

  onIsPublicChange(value: boolean): void {
    this.model.update((m) => ({ ...m, is_public: value }));
  }

  onPriceChange(value: number | null): void {
    this.model.update((m) => ({ ...m, price: value ?? 0 }));
  }

  onStripeAccountChange(value: string | null): void {
    this.model.update((m) => ({ ...m, stripe_account_id: value }));
  }
}
