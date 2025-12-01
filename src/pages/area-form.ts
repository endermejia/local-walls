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
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { AreasService } from '../services';
import type { AreaDto } from '../models/supabase-tables.dto';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

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
        <label tuiLabel for="area-name">{{ 'areas.name' | translate }}</label>
        <input
          tuiTextfield
          id="area-name"
          [formControl]="name"
          type="text"
          required
          [attr.aria-invalid]="name.invalid"
        />
        @if (name.invalid && name.touched) {
          <tui-error>{{ 'errors.required' | translate }}</tui-error>
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
        <button tuiButton appearance="primary" type="submit">
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(Location);
  // Optional dialog context when used inside TuiDialogService
  private readonly _dialogCtx: TuiDialogContext<
    string | null,
    { areaSlug?: string }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<string | null, { areaSlug?: string }>
      >();
    } catch {
      return null;
    }
  })();

  // areaSlug route param for edit variant (optional)
  areaSlug: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  // slug that comes from dialog data when opened as a dialog
  private readonly dialogDataSlug: string | undefined =
    this._dialogCtx?.data?.areaSlug;

  private readonly effectiveSlug: Signal<string | undefined> = computed(
    () => this.dialogDataSlug ?? this.areaSlug(),
  );

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveSlug());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, load the area by slug
    effect(() => {
      const slug = this.effectiveSlug();
      if (!slug) return;
      void this.loadArea(slug);
    });
  }

  private async loadArea(slug: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    const area: AreaDto | null = await this.areas.getBySlug(slug);
    if (area) {
      this.editingId = area.id;
      this.name.setValue(area.name);
    }
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
    const slug = this.slugify(name);
    const payload = { name, slug } as const;
    try {
      if (this.isEdit()) {
        if (this.editingId == null) return;
        await this.areas.update(this.editingId, payload);
      } else {
        await this.areas.create(payload);
      }
      // Close the dialog if present, otherwise navigate back
      if (this._dialogCtx) {
        // Return the new slug so the caller can navigate if it changed
        this._dialogCtx.completeWith(slug);
      } else {
        this.goBack();
      }
    } catch (e) {
      // Errors ya se loguean en service
    }
  }

  private slugify(value: string): string {
    if (!value) return '';
    // Normalize to NFD to separate diacritics, then remove them
    let v = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .toLowerCase()
      .trim();
    // Replace non-alphanumeric (a-z, 0-9) with hyphens
    v = v.replace(/[^a-z0-9]+/g, '-');
    // Collapse multiple hyphens
    v = v.replace(/-+/g, '-');
    // Trim leading/trailing hyphens
    v = v.replace(/^-/g, '').replace(/-$/g, '');
    return v;
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}
