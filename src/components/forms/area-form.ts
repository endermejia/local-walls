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
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit } from '@angular/forms/signals';

import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLabel,
} from '@taiga-ui/core';
import { TuiInputChip, TuiInputNumber } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { SlugService } from '../../services/slug.service';
import { ToastService } from '../../services/toast.service';

import { handleErrorToast, slugify } from '../../utils';

import { CounterComponent } from '../ui/counter';

interface MinimalArea {
  id?: number;
  name: string;
  slug?: string;
  eight_anu_crag_slugs?: string[];
}

@Component({
  selector: 'app-area-form',
  imports: [
    CommonModule,
    CounterComponent,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiError,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputNumber,
    TuiLabel,
  ],
  styles: `
    .visibility-card {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem;
      border-radius: 1rem;
      border: 2px solid var(--tui-border-normal);
      background: var(--tui-background-neutral-1);
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.2s,
        background 0.2s;
      width: 100%;
    }

    .visibility-card:hover {
      background: var(--tui-background-neutral-1-hover);
    }

    .visibility-card--selected {
      border-color: var(--tui-border-focus);
      background: color-mix(
        in oklab,
        var(--tui-background-accent-1) 12%,
        var(--tui-background-base)
      );
    }

    .visibility-card__icon {
      flex-shrink: 0;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.625rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--tui-background-neutral-2);
      color: var(--tui-text-primary);
      transition:
        background 0.2s,
        color 0.2s;
    }

    .visibility-card__icon--selected {
      background: var(--tui-text-action);
      color: #fff;
    }

    .visibility-card__body {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
      flex: 1;
    }

    .visibility-card__title {
      font-weight: 700;
      font-size: 0.8125rem;
      line-height: 1.2;
    }

    .visibility-card__desc {
      font-size: 0.8125rem;
      opacity: 0.6;
      line-height: 1.3;
    }

    .visibility-card__check {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      color: var(--tui-text-action);
      font-size: 0.875rem;
    }
  `,
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield class="block">
        <label tuiLabel for="area-name">{{ 'name' | translate }}</label>
        <input
          tuiInput
          id="area-name"
          [formField]="areaForm.name"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>
      @if (areaForm.name().invalid() && areaForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      @if (isEdit() && authState.isAdmin()) {
        <tui-textfield class="block">
          <label tuiLabel for="area-slug">{{ 'slug' | translate }}</label>
          <input
            tuiInput
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

      <!-- Admin Settings / Payments Section -->
      @if (canEditAdminSettings()) {
        <div class="flex flex-col gap-4 pt-2">
          <!-- Visibility cards — full width, 1 col mobile / 3 col desktop -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- Public Option -->
            <button
              type="button"
              class="visibility-card"
              [class.visibility-card--selected]="visibilityMode() === 'public'"
              (click.zoneless)="onVisibilityModeChange('public')"
            >
              <div
                class="visibility-card__icon"
                [class.visibility-card__icon--selected]="
                  visibilityMode() === 'public'
                "
              >
                <tui-icon icon="@tui.globe" />
              </div>
              <div class="visibility-card__body">
                <span class="visibility-card__title">{{
                  'payments.isPublic' | translate
                }}</span>
                <span class="visibility-card__desc">{{
                  'payments.isPublic.desc' | translate
                }}</span>
              </div>
              @if (visibilityMode() === 'public') {
                <tui-icon
                  icon="@tui.circle-check"
                  class="visibility-card__check"
                />
              }
            </button>

            <!-- Secret Option -->
            <button
              type="button"
              class="visibility-card"
              [class.visibility-card--selected]="visibilityMode() === 'secret'"
              (click.zoneless)="onVisibilityModeChange('secret')"
            >
              <div
                class="visibility-card__icon"
                [class.visibility-card__icon--selected]="
                  visibilityMode() === 'secret'
                "
              >
                <tui-icon icon="@tui.mail" />
              </div>
              <div class="visibility-card__body">
                <span class="visibility-card__title">{{
                  'payments.isSecret' | translate
                }}</span>
                <span class="visibility-card__desc">{{
                  'payments.isSecret.desc' | translate
                }}</span>
              </div>
              @if (visibilityMode() === 'secret') {
                <tui-icon
                  icon="@tui.circle-check"
                  class="visibility-card__check"
                />
              }
            </button>

            <!-- Paywalled Option -->
            <button
              type="button"
              class="visibility-card"
              [class.visibility-card--selected]="
                visibilityMode() === 'paywalled'
              "
              (click.zoneless)="onVisibilityModeChange('paywalled')"
            >
              <div
                class="visibility-card__icon"
                [class.visibility-card__icon--selected]="
                  visibilityMode() === 'paywalled'
                "
              >
                <tui-icon icon="@tui.coins" />
              </div>
              <div class="visibility-card__body">
                <span class="visibility-card__title">{{
                  'payments.isPaywalled' | translate
                }}</span>
                <span class="visibility-card__desc">{{
                  'payments.isPaywalled.desc' | translate
                }}</span>
              </div>
              @if (visibilityMode() === 'paywalled') {
                <tui-icon
                  icon="@tui.circle-check"
                  class="visibility-card__check"
                />
              }
            </button>
          </div>

          <!-- Secret mode notice -->
          @if (visibilityMode() === 'secret') {
            <div
              class="flex items-start gap-3 px-4 py-3 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
            >
              <tui-icon
                icon="@tui.info"
                class="text-(--tui-text-action) shrink-0 mt-0.5"
              />
              <p class="text-sm opacity-80 leading-relaxed">
                {{ 'payments.isSecret.notice' | translate }}
              </p>
            </div>
          }

          <!-- Paywalled settings -->
          @if (visibilityMode() === 'paywalled') {
            <div class="flex flex-col gap-4 max-w-md">
              <app-counter
                label="payments.price"
                suffix="€"
                [step]="0.5"
                [min]="2"
                [max]="20"
                [ngModel]="model().price || 2"
                (ngModelChange)="onPriceChange($event)"
                name="price"
              />
              <p class="text-xs opacity-60 mt-1">
                {{ 'payments.priceHelp' | translate }}
              </p>
            </div>
          }
        </div>
      }

      <div class="flex flex-wrap gap-2 justify-end">
        <button
          tuiButton
          appearance="flat"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="
            areaForm.name().invalid() ||
            (isEdit() && authState.isAdmin() && areaForm.slug().invalid())
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
  protected readonly authState = inject(AuthStateService);
  private readonly location = inject(Location);
  private readonly slugService = inject(SlugService);
  private readonly toast = inject(ToastService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { areaId?: number; areaData?: MinimalArea }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<string | boolean | null, { areaData?: MinimalArea }>
      >();
    } catch {
      return null;
    }
  })();

  // When using as a routed/page component, an input can provide the area data for editing
  areaData: InputSignal<MinimalArea | undefined> = input<
    MinimalArea | undefined
  >(undefined);

  // Area data when opened as a dialog
  private readonly dialogAreaData: MinimalArea | undefined =
    this._dialogCtx?.data?.areaData;

  private readonly effectiveAreaData: Signal<MinimalArea | undefined> =
    computed(() => this.dialogAreaData ?? this.areaData());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveAreaData()?.id,
  );
  readonly isAdmin: Signal<boolean> = computed(() => this.authState.isAdmin());

  readonly canEditAdminSettings: Signal<boolean> = computed(() => {
    const isAdmin = this.authState.canEditAsAdmin() || this.authState.isAdmin();
    const areaId = this.editingId;
    const isAreaAdmin = areaId
      ? !!this.authState.areaAdminPermissions()[areaId]
      : false;
    return isAdmin || isAreaAdmin;
  });

  model = signal<{
    name: string;
    slug: string;
    eight_anu_crag_slugs: string[];
    is_public: boolean;
    price: number | null;
  }>({
    name: '',
    slug: '',
    eight_anu_crag_slugs: [],
    is_public: true,
    price: 0,
  });

  readonly isSecretArea = computed(() => {
    return (
      !this.model().is_public &&
      (this.model().price === null || this.model().price === 0)
    );
  });

  readonly visibilityMode = computed<'public' | 'secret' | 'paywalled'>(() => {
    const m = this.model();
    if (m.is_public) {
      return 'public';
    }
    if (m.price === null || m.price === 0) {
      return 'secret';
    }
    return 'paywalled';
  });

  areaForm = form(this.model, (path) => {
    required(path.name);
    required(path.slug, {
      when: () => this.isEdit() && this.authState.isAdmin(),
    });
  });

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, prefill the form with provided data
    effect(() => {
      const data = this.effectiveAreaData();
      if (!data) return;
      this.editingId = data.id || null;
      this.model.update((m) => ({
        ...m,
        name: data.name,
        slug: data.slug || '',
        eight_anu_crag_slugs:
          data.eight_anu_crag_slugs || m.eight_anu_crag_slugs,
      }));

      if (data.id) {
        // Fetch full data to get eight_anu_crag_slugs and visibility settings when editing
        this.fetchFullAreaData(data.id);
      }
    });

    // Synchronous auto-slug preview update
    effect(() => {
      if (this.isEdit()) return;
      const name = this.model().name;
      if (!name) return;

      const generatedSlug = slugify(name);
      untracked(() => {
        const currentSlug = this.model().slug;
        if (currentSlug !== generatedSlug) {
          this.model.update((m) => ({ ...m, slug: generatedSlug }));
        }
      });
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

      let finalSlug = model.slug;
      if (!this.isEdit() || !finalSlug) {
        const baseSlug = slugify(model.name || 'area');
        finalSlug = await this.slugService.getUniqueSlug('areas', baseSlug);
      }

      const payload = {
        name: model.name,
        slug: finalSlug,
        is_public: model.is_public,
        price: model.is_public ? null : model.price,
        eight_anu_crag_slugs: model.eight_anu_crag_slugs,
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
      } catch (error) {
        console.error('[AreaFormComponent] Error submitting area:', error);
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

  onVisibilityModeChange(mode: 'public' | 'secret' | 'paywalled'): void {
    if (mode === 'public') {
      this.model.update((m) => ({ ...m, is_public: true, price: null }));
    } else if (mode === 'secret') {
      this.model.update((m) => ({ ...m, is_public: false, price: null }));
    } else if (mode === 'paywalled') {
      this.model.update((m) => ({
        ...m,
        is_public: false,
        price: m.price || 2,
      }));
    }
  }

  onPriceChange(value: number | null): void {
    this.model.update((m) => ({ ...m, price: value }));
  }
}
