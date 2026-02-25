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

import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { TuiInputChip } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../services/areas.service';
import { ToastService } from '../services/toast.service';

import { handleErrorToast, slugify } from '../utils';

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
    TranslatePipe,
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
            [formField]="$any(areaForm.eight_anu_crag_slugs)"
            autocomplete="off"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>
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
            areaForm.name().invalid() ||
            (isEdit() && areaForm.slug().invalid()) ||
            (!areaForm.name().dirty() &&
              isEdit() &&
              !areaForm.slug().dirty() &&
              !areaForm.eight_anu_crag_slugs().dirty())
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

  model = signal<{
    name: string;
    slug: string;
    eight_anu_crag_slugs: string[];
  }>({
    name: '',
    slug: '',
    eight_anu_crag_slugs: [],
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
      this.model.update((m) => ({ ...m, name: data.name, slug: data.slug }));

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
}
