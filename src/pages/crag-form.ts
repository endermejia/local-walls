import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  Signal,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';
import { CragsService } from '../services';
import { slugify } from '../utils';
import { TuiInputNumber } from '@taiga-ui/kit';

type MinimalCrag = {
  id: number;
  area_id: number;
  name: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  approach?: number | null;
  description_es?: string | null;
  description_en?: string | null;
  warning_es?: string | null;
  warning_en?: string | null;
};

@Component({
  selector: 'app-crag-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiError,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiInputNumber,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="crag-name">{{ 'labels.name' | translate }}</label>
        <input
          tuiTextfield
          id="crag-name"
          [formControl]="name"
          type="text"
          required
          [invalid]="name.invalid && name.touched"
        />
        @if (name.invalid && name.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="lat">{{ 'labels.lat' | translate }}</label>
          <input tuiInputNumber id="lat" [formControl]="latitude" />
        </tui-textfield>
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="lng">{{ 'labels.lng' | translate }}</label>
          <input tuiInputNumber id="lng" [formControl]="longitude" />
        </tui-textfield>
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="approach">{{
            'labels.approach' | translate
          }}</label>
          <input tuiInputNumber id="approach" [formControl]="approach" />
          <span class="tui-textfield__suffix">min.</span>
        </tui-textfield>
      </div>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-es">{{
          'labels.description_es' | translate
        }}</label>
        <input tuiTextfield id="desc-es" [formControl]="description_es" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="desc-en">{{
          'labels.description_en' | translate
        }}</label>
        <input tuiTextfield id="desc-en" [formControl]="description_en" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-es">{{
          'labels.warning_es' | translate
        }}</label>
        <input tuiTextfield id="warn-es" [formControl]="warning_es" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="warn-en">{{
          'labels.warning_en' | translate
        }}</label>
        <input tuiTextfield id="warn-en" [formControl]="warning_en" />
      </tui-textfield>

      <div class="flex gap-2 justify-end">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'common.cancel' | translate }}
        </button>
        <button
          [disabled]="name.invalid || (!name.dirty && !isEdit())"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'common.save' : 'common.create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class CragFormComponent {
  private readonly crags = inject(CragsService);
  private readonly location = inject(Location);
  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { areaId?: number; cragData?: MinimalCrag }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { areaId?: number; cragData?: MinimalCrag }
        >
      >();
    } catch {
      return null;
    }
  })();

  // Inputs alternativos para uso embebido o en rutas (edición/creación)
  areaId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  cragData: InputSignal<MinimalCrag | undefined> = input<
    MinimalCrag | undefined
  >(undefined);

  private readonly dialogAreaId = this._dialogCtx?.data?.areaId;
  private readonly dialogCragData = this._dialogCtx?.data?.cragData;

  private readonly effectiveAreaId: Signal<number | undefined> = computed(
    () => this.dialogAreaId ?? this.areaId(),
  );
  private readonly effectiveCragData: Signal<MinimalCrag | undefined> =
    computed(() => this.dialogCragData ?? this.cragData());

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveCragData());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  latitude = new FormControl<number | null>(null);
  longitude = new FormControl<number | null>(null);
  approach = new FormControl<number | null>(null);
  description_es = new FormControl<string | null>(null);
  description_en = new FormControl<string | null>(null);
  warning_es = new FormControl<string | null>(null);
  warning_en = new FormControl<string | null>(null);

  private editingId: number | null = null;
  private editingAreaId: number | null = null;

  constructor() {
    // Prefill en edición
    effect(() => {
      const data = this.effectiveCragData();
      if (!data) return;
      this.editingId = data.id;
      this.editingAreaId = data.area_id;
      this.name.setValue(data.name ?? '');
      this.latitude.setValue(data.latitude ?? null);
      this.longitude.setValue(data.longitude ?? null);
      this.approach.setValue(data.approach ?? null);
      this.description_es.setValue(data.description_es ?? null);
      this.description_en.setValue(data.description_en ?? null);
      this.warning_es.setValue(data.warning_es ?? null);
      this.warning_en.setValue(data.warning_en ?? null);
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    const name = this.name.value;
    const slug = slugify(name);
    const base = {
      name,
      slug,
      latitude: this.latitude.value,
      longitude: this.longitude.value,
      approach: this.approach.value,
      description_es: this.description_es.value,
      description_en: this.description_en.value,
      warning_es: this.warning_es.value,
      warning_en: this.warning_en.value,
    } as const;

    try {
      if (this.isEdit()) {
        if (this.editingId == null) return;
        await this.crags.update(this.editingId, base as any);
      } else {
        const area_id =
          this.effectiveAreaId() ?? this.editingAreaId ?? undefined;
        if (!area_id) return; // área requerida para crear
        await this.crags.create({ area_id, ...base } as any);
      }
      if (this._dialogCtx) {
        this._dialogCtx.completeWith(this.isEdit() ? slug : true);
      } else {
        this.goBack();
      }
    } catch {
      /* empty */
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

export default CragFormComponent;
