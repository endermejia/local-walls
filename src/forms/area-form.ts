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
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit } from '@angular/forms/signals';

import { TuiInputChip, TuiCheckbox, TuiInputNumber } from '@taiga-ui/kit';
import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiTextfield,
  TuiIcon,
  TuiLoader,
  TuiDialogService,
} from '@taiga-ui/core';
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
    TuiIcon,
    TuiLoader,
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
        <div class="border-t pt-6 mt-4">
          <h3 class="font-bold text-xl mb-6">
            {{ 'payments.title' | translate }}
          </h3>

          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start"
          >
            <div class="flex flex-col gap-4 lg:gap-6">
              <!-- Public Toggle -->
              <label
                tuiLabel
                class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <input
                  tuiCheckbox
                  type="checkbox"
                  [ngModel]="model().is_public"
                  (ngModelChange)="onIsPublicChange($event)"
                  name="is_public"
                />
                <div class="flex flex-col">
                  <span class="font-bold text-sm lg:text-base">{{
                    'payments.isPublic' | translate
                  }}</span>
                </div>
              </label>

              @if (!model().is_public) {
                <app-counter
                  label="payments.price"
                  suffix="€"
                  [step]="0.5"
                  [min]="0.5"
                  [max]="20"
                  [ngModel]="model().price"
                  (ngModelChange)="onPriceChange($event)"
                  name="price"
                />

                <div class="flex flex-col gap-3">
                  <span
                    class="text-xs font-semibold opacity-60 uppercase tracking-wider"
                    >{{ 'payments.stripeAccountId' | translate }}</span
                  >

                  <div class="flex flex-col gap-4">
                    @if (model().stripe_account_id) {
                      <div
                        class="flex items-center gap-3 p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/50 rounded-2xl"
                      >
                        <tui-icon
                          icon="@tui.check-circle"
                          class="text-green-600 shrink-0"
                        />
                        <div class="flex flex-col gap-1 overflow-hidden">
                          <span class="text-sm font-bold leading-none">{{
                            'payments.stripeConnected' | translate
                          }}</span>
                          <span
                            class="text-[10px] lg:text-xs opacity-60 truncate font-mono"
                            >{{ model().stripe_account_id }}</span
                          >
                        </div>
                      </div>
                    }

                    <tui-loader [showLoader]="connecting()" [overlay]="true">
                      <button
                        tuiButton
                        type="button"
                        appearance="secondary"
                        size="m"
                        class="w-full text-xs lg:text-sm"
                        (click.zoneless)="onConnectStripe()"
                        [iconStart]="
                          model().stripe_account_id
                            ? '@tui.refresh-ccw'
                            : '@tui.external-link'
                        "
                      >
                        {{
                          (model().stripe_account_id
                            ? 'payments.reconnectStripe'
                            : 'payments.connectWithStripe'
                          ) | translate
                        }}
                      </button>
                    </tui-loader>
                  </div>
                </div>
              }
            </div>

            @if (!model().is_public) {
              <div class="flex flex-col h-full">
                <div
                  class="bg-gray-100/50 dark:bg-gray-800/30 p-4 lg:p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col gap-4"
                >
                  <h4 class="font-bold flex items-center gap-2 text-blue-600">
                    <tui-icon icon="@tui.info" />
                    {{ 'payments.tutorial.title' | translate }}
                  </h4>
                  <ul class="space-y-4">
                    <li class="flex gap-4 text-xs lg:text-sm">
                      <span
                        class="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xs"
                        >1</span
                      >
                      <p>{{ 'payments.tutorial.step1' | translate }}</p>
                    </li>
                    <li class="flex gap-4 text-xs lg:text-sm">
                      <span
                        class="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xs"
                        >2</span
                      >
                      <p>{{ 'payments.tutorial.step2' | translate }}</p>
                    </li>
                    <li class="flex gap-4 text-xs lg:text-sm">
                      <span
                        class="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xs"
                        >3</span
                      >
                      <p>{{ 'payments.tutorial.step3' | translate }}</p>
                    </li>
                    <li class="flex gap-4 text-xs lg:text-sm">
                      <span
                        class="w-6 h-6 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xs"
                        >4</span
                      >
                      <p>{{ 'payments.tutorial.step4' | translate }}</p>
                    </li>
                  </ul>
                  <p
                    class="text-[10px] lg:text-xs opacity-60 italic mt-2 py-3 border-t"
                  >
                    {{ 'payments.tutorial.footer' | translate }}
                  </p>
                </div>
              </div>
            }
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

    <ng-template #accountDialog let-observer let-accounts="data">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h2 class="text-xl font-bold">
            {{ 'payments.selectAccountTitle' | translate }}
          </h2>
          <p class="opacity-60 text-sm">
            {{ 'payments.selectAccountDescription' | translate }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          @for (acc of accounts; track acc.stripe_account_id) {
            <button
              tuiButton
              appearance="secondary"
              class="w-full text-start"
              (click)="
                observer.next(acc.stripe_account_id); observer.complete()
              "
            >
              {{ 'payments.reuseAccount' | translate: { name: acc.name } }}
            </button>
          }
          <div class="border-t my-2"></div>
          <button
            tuiButton
            appearance="primary"
            class="w-full"
            (click)="observer.next('NEW'); observer.complete()"
          >
            {{ 'payments.createNewAccount' | translate }}
          </button>
        </div>

        <button
          tuiButton
          appearance="flat"
          (click)="observer.complete()"
          class="w-full"
        >
          {{ 'cancel' | translate }}
        </button>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class AreaFormComponent {
  private readonly areas = inject(AreasService);
  private readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  @ViewChild('accountDialog') accountDialogTemplate?: TemplateRef<unknown>;

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

  connecting = signal(false);

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
      const model = this.model();
      const payload = {
        name: model.name,
        slug: this.isEdit() ? model.slug : slugify(model.name),
        is_public: model.is_public,
        price: model.price,
        eight_anu_crag_slugs: model.eight_anu_crag_slugs,
        stripe_account_id: model.stripe_account_id,
      };

      try {
        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.areas.update(this.editingId, payload);
        } else {
          await this.areas.create(payload);
        }
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(
            this.isEdit() ? (payload.slug ?? true) : true,
          );
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

  async onConnectStripe(
    stripeAccountId?: string,
    forceNew?: boolean,
  ): Promise<void> {
    const areaId = this.editingId;
    if (!areaId) return;

    this.connecting.set(true);
    try {
      const data = await this.areas.connectStripe(
        areaId,
        stripeAccountId,
        forceNew,
      );

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.status === 'multiple_accounts' && data.accounts) {
        this.dialogs
          .open<string>(this.accountDialogTemplate!, {
            data: data.accounts,
            size: 's',
          })
          .subscribe((choice) => {
            if (choice === 'NEW') {
              this.onConnectStripe(undefined, true);
            } else if (choice) {
              this.onConnectStripe(choice);
            }
          });
      }
    } finally {
      this.connecting.set(false);
    }
  }
}
