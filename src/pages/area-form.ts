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
import { Router } from '@angular/router';
import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { AreasService } from '../services';
import type { AreaDto } from '../models/supabase-tables.dto';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { TuiBadge } from '@taiga-ui/kit';

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
    TuiBadge,
  ],
  template: `
    <section class="w-full max-w-xl mx-auto p-4">
      <header class="mb-4 flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <tui-badge
            class="cursor-pointer hidden sm:block"
            [appearance]="'neutral'"
            iconStart="@tui.chevron-left"
            size="xl"
            (click.zoneless)="goBack()"
            [attr.aria-label]="'actions.back' | translate"
            [attr.title]="'actions.back' | translate"
          />
          <h1 class="text-2xl font-bold">
            {{ (isEdit() ? 'areas.editTitle' : 'areas.newTitle') | translate }}
          </h1>
        </div>
      </header>

      <form class="grid gap-4" (submit.zoneless)="onSubmit()">
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

        <tui-textfield class="block">
          <label tuiLabel for="area-slug">{{ 'areas.slug' | translate }}</label>
          <input
            tuiTextfield
            id="area-slug"
            [formControl]="slug"
            type="text"
            required
            [attr.aria-invalid]="slug.invalid"
          />
          @if (slug.invalid && slug.touched) {
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
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class AreaFormComponent {
  private readonly areas = inject(AreasService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(Location);

  // areaSlug route param for edit variant (optional)
  areaSlug: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  readonly isEdit: Signal<boolean> = computed(() => !!this.areaSlug());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  slug = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // Internal id used for updates when editing
  private editingId: number | null = null;

  constructor() {
    // When editing, load the area by slug
    effect(() => {
      const slug = this.areaSlug();
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
      this.slug.setValue(area.slug);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.name.invalid || this.slug.invalid) {
      this.name.markAsTouched();
      this.slug.markAsTouched();
      return;
    }
    const payload = { name: this.name.value, slug: this.slug.value } as const;
    try {
      if (this.isEdit()) {
        if (this.editingId == null) return;
        await this.areas.update(this.editingId, payload);
      } else {
        await this.areas.create(payload);
      }
      this.goBack();
    } catch (e) {
      // Errors ya se loguean en service
    }
  }

  goBack(): void {
    this.location.back();
  }
}

export default AreaFormComponent;
