import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  Signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { AreasService, GlobalData } from '../services';
import { TranslatePipe } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';
import { slugify } from '../utils';

@Component({
  selector: 'app-area-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiError,
    TuiLabel,
    TuiTextfield,
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
          [disabled]="name.invalid || !name.dirty"
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
export class AreaFormComponent {
  private readonly areas = inject(AreasService);
  private readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  // Optional dialog context when used inside TuiDialogService
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

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, prefill the form with provided data
    effect(() => {
      const data = this.effectiveAreaData();
      if (!data) return;
      this.editingId = data.id;
      this.name.setValue(data.name);
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    // Prevent native form submission when using (submit) instead of (ngSubmit)
    event?.preventDefault();
    event?.stopPropagation();
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    const name = this.name.value;
    const slug = slugify(name);
    const payload = { name, slug } as const;
    try {
      if (this.isEdit()) {
        if (this.editingId == null) return;
        await this.areas.update(this.editingId, payload);
        // Keep GlobalData in sync when editing the currently loaded area
        const g = this.global.area();
        if (g && g.id === this.editingId) {
          this.global.area.set({ ...g, name, slug });
        }
      } else {
        await this.areas.create(payload);
      }
      // Close the dialog if present, otherwise navigate back
      if (this._dialogCtx) {
        // Return a boolean on create, or the slug on edit
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
