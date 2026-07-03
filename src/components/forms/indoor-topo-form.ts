import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/core';
import { TuiButton, TuiLabel, TuiInput, TuiError } from '@taiga-ui/core';
import { TuiSelect, TuiChevron, TuiInputFiles } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { IndoorTopoDto } from '../../models';

export interface IndoorTopoFormData {
  centerId: string;
  topoData?: IndoorTopoDto;
}

@Component({
  selector: 'app-indoor-topo-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiLabel,
    TuiInput,
    TuiError,
    TuiSelect,
    TuiChevron,
    TuiInputFiles,
    FormField,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit()">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'name' | translate }}</label>
        <input tuiInput id="name" [formField]="tForm.name" autocomplete="off" />
      </tui-textfield>
      @if (tForm.name().invalid() && tForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield tuiChevron [tuiTextfieldCleaner]="false">
        <label tuiLabel for="climbing_kind">{{ 'type' | translate }}</label>
        <select tuiSelect id="climbing_kind" [formField]="tForm.climbing_kind">
          <option value="sport">Sport</option>
          <option value="boulder">Boulder</option>
        </select>
      </tui-textfield>

      <!-- Image upload section -->
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium opacity-70">{{
          'merchandising.items.gallery' | translate
        }}</span>

        <div class="flex items-center gap-4">
          @if (imagePreview() || existingImageUrl()) {
            <div
              class="w-32 aspect-video rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800"
            >
              <img
                [src]="
                  imagePreview() ||
                  supabase.getPublicUrl(
                    'indoor-assets',
                    existingImageUrl() || ''
                  )
                "
                class="w-full h-full object-cover"
                alt="Preview"
              />
            </div>
          }

          <label tuiInputFiles>
            <input
              accept="image/*"
              type="file"
              tuiInputFiles
              [ngModel]="null"
              [ngModelOptions]="{ standalone: true }"
              (change)="onFileSelected($event)"
            />
            <button
              tuiButton
              type="button"
              appearance="secondary"
              size="s"
              iconStart="@tui.plus"
            >
              {{ 'merchandising.items.addImage' | translate }}
            </button>
          </label>
        </div>
      </div>

      <footer class="flex flex-wrap gap-2 justify-end items-center mt-4">
        <button
          appearance="secondary"
          tuiButton
          type="button"
          (click.zoneless)="onCancel()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          type="submit"
          [disabled]="
            tForm.name().invalid() ||
            isSaving() ||
            (!existingImageUrl() && !selectedFile())
          "
        >
          {{ 'save' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IndoorTopoFormComponent {
  private readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  private readonly context =
    injectContext<TuiDialogContext<boolean, IndoorTopoFormData>>();

  protected readonly isSaving = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly existingImageUrl = signal<string | null>(null);

  protected readonly model = signal<{
    name: string;
    climbing_kind: 'sport' | 'boulder';
  }>({
    name: '',
    climbing_kind: 'sport',
  });

  protected readonly tForm = form(this.model, (path) => {
    required(path.name);
  });

  constructor() {
    const data = this.context.data.topoData;
    if (data) {
      this.model.set({
        name: data.name,
        climbing_kind: (data.climbing_kind as 'sport' | 'boulder') || 'sport',
      });
      this.existingImageUrl.set(data.image_url);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  protected onCancel(): void {
    this.context.completeWith(false);
  }

  protected onSubmit(): void {
    submit(this.tForm, async () => {
      this.isSaving.set(true);
      try {
        const m = this.model();
        let finalImageUrl = this.existingImageUrl() || '';

        const file = this.selectedFile();
        if (file) {
          const uploadedPath = await this.indoor.uploadAsset(
            this.context.data.centerId,
            file,
          );
          if (uploadedPath) {
            finalImageUrl = uploadedPath;
          }
        }

        const payload = {
          center_id: this.context.data.centerId,
          name: m.name,
          climbing_kind: m.climbing_kind,
          image_url: finalImageUrl,
          legacy: false,
          start_date: null,
          end_date: null,
        };

        if (this.context.data.topoData) {
          await this.indoor.updateTopo(this.context.data.topoData.id, payload);
          this.toast.success('topos.updateSuccess');
        } else {
          await this.indoor.createTopo(payload);
          this.toast.success('topos.createSuccess');
        }
        this.context.completeWith(true);
      } catch (e) {
        console.error('[IndoorTopoFormComponent] Error saving topo:', e);
        this.toast.error('errors.unexpected');
      } finally {
        this.isSaving.set(false);
      }
    });
  }
}
