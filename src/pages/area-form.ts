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
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { TuiInputChip } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService, ToastService } from '../services';

import { handleErrorToast, slugify } from '../utils';

@Component({
  selector: 'app-area-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
        <label tuiLabel for="area-name">{{ 'labels.name' | translate }}</label>
        <input
          tuiTextfield
          id="area-name"
          [formControl]="name"
          type="text"
          required
          [invalid]="name.invalid && name.touched"
        />
        @if (name.invalid && name.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      @if (isEdit()) {
        <tui-textfield class="block">
          <label tuiLabel for="area-slug">{{
            'labels.slug' | translate
          }}</label>
          <input
            tuiTextfield
            id="area-slug"
            [formControl]="slug"
            type="text"
            required
            [invalid]="slug.invalid && slug.touched"
          />
          @if (slug.invalid && slug.touched) {
            <tui-error [error]="'errors.required' | translate" />
          }
        </tui-textfield>

        <tui-textfield multi class="block">
          <label tuiLabel for="eight-anu-slugs">
            {{ 'import8a.slugs' | translate }}
          </label>
          <input
            tuiInputChip
            id="eight-anu-slugs"
            [formControl]="eight_anu_crag_slugs"
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
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          [disabled]="
            name.invalid ||
            (isEdit() && slug.invalid) ||
            (!name.dirty &&
              isEdit() &&
              !slug.dirty &&
              !eight_anu_crag_slugs.dirty)
          "
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'actions.save' : 'actions.create') | translate }}
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

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  slug = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  eight_anu_crag_slugs = new FormControl<string[] | null>([]);

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, prefill the form with provided data
    effect(() => {
      const data = this.effectiveAreaData();
      if (!data) return;
      this.editingId = data.id;
      this.name.setValue(data.name);
      this.slug.setValue(data.slug);

      // Fetch full data to get eight_anu_crag_slugs if not provided in dialog data
      // Actually, we should probably update AreaDto in the input if we want it here.
      // But the issue says: "añade un input en area-form (cuando se esté editando) para poder modificar el slug."
      // "añade un tui-input-chip en area-form con los Slugs de 8a.nu"
      // Let's assume the dialog data might not have it, so we might need to fetch it or ensure it's passed.
      // If we look at AreasService.openAreaForm, it only passes id, name, slug.
      this.fetchFullAreaData(data.id);
    });
  }

  private async fetchFullAreaData(id: number) {
    const { data, error } = await this.areas.getById(id);
    if (data && !error) {
      this.eight_anu_crag_slugs.setValue(data.eight_anu_crag_slugs || []);
      this.slug.markAsPristine();
      this.name.markAsPristine();
    }
  }

  async onSubmit(event?: Event): Promise<void> {
    // Prevent native form submission when using (submit) instead of (ngSubmit)
    event?.preventDefault();
    event?.stopPropagation();
    if (this.name.invalid || (this.isEdit() && this.slug.invalid)) {
      this.name.markAsTouched();
      this.slug.markAsTouched();
      return;
    }
    const name = this.name.value;
    const payload = this.isEdit()
      ? {
          name,
          slug: this.slug.value,
          eight_anu_crag_slugs: this.eight_anu_crag_slugs.value,
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
        this._dialogCtx.completeWith(
          this.isEdit() ? (this.slug.value ?? true) : true,
        );
      } else {
        this.goBack();
      }
    } catch (e) {
      const error = e as Error;
      console.error('[AreaFormComponent] Error submitting area:', e);
      handleErrorToast(error, this.toast);
    }
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}
