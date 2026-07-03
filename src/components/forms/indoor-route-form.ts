import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiLabel,
  TuiInput,
  TuiError,
  TuiDropdown,
  TuiCheckbox,
} from '@taiga-ui/core';
import { TuiChevron, TuiSelect, TuiDataListWrapper } from '@taiga-ui/kit';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IndoorService } from '../../services/indoor.service';
import { ToastService } from '../../services/toast.service';
import {
  IndoorRouteDto,
  IndoorTopoDto,
  ORDERED_GRADE_VALUES,
} from '../../models';
import { slugify } from '../../utils/slugify';

export interface IndoorRouteFormData {
  centerId: string;
  routeData?: IndoorRouteDto;
}

@Component({
  selector: 'app-indoor-route-form',
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
    TuiDataListWrapper,
    TuiCheckbox,
    TuiDropdown,
    FormField,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit()">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'name' | translate }}</label>
        <input tuiInput id="name" [formField]="rForm.name" autocomplete="off" />
      </tui-textfield>
      @if (rForm.name().invalid() && rForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield tuiChevron [tuiTextfieldCleaner]="false">
        <label tuiLabel for="climbing_kind">{{ 'type' | translate }}</label>
        <select tuiSelect id="climbing_kind" [formField]="rForm.climbing_kind">
          <option value="sport">Sport</option>
          <option value="boulder">Boulder</option>
        </select>
      </tui-textfield>

      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="stringifyGrade"
      >
        <label tuiLabel for="grade">{{ 'grade' | translate }}</label>
        <input tuiSelect id="grade" [formField]="rForm.gradeLabel" />
        <tui-data-list-wrapper *tuiDropdown [items]="gradeOptions" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="true">
        <label tuiLabel for="color">{{ 'color' | translate }}</label>
        <input
          tuiInput
          id="color"
          [formField]="rForm.color"
          autocomplete="off"
        />
      </tui-textfield>

      @if (topos().length > 0) {
        <tui-textfield
          tuiChevron
          [tuiTextfieldCleaner]="true"
          [stringify]="stringifyTopo"
        >
          <label tuiLabel for="topo">{{ 'topo' | translate }}</label>
          <input tuiSelect id="topo" [formField]="rForm.topo" />
          <tui-data-list-wrapper *tuiDropdown [items]="topos()" />
        </tui-textfield>
      }

      <label class="flex items-center gap-2 mt-2">
        <input tuiCheckbox type="checkbox" [formField]="rForm.legacy" />
        <span>{{ 'indoor.legacy' | translate }}</span>
      </label>

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
          [disabled]="rForm.name().invalid() || isSaving()"
        >
          {{ 'save' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IndoorRouteFormComponent {
  private readonly indoor = inject(IndoorService);
  private readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);

  private readonly context =
    injectContext<TuiDialogContext<boolean, IndoorRouteFormData>>();

  protected readonly isSaving = signal(false);
  protected readonly gradeOptions = ORDERED_GRADE_VALUES.slice(0, -1); // exclude '?'

  protected readonly stringifyGrade = (g: string) => g;
  protected readonly stringifyTopo = (t: IndoorTopoDto) => t.name;

  protected readonly topos = computed(() => this.toposResource.value() || []);

  protected readonly toposResource = resource({
    params: () => this.context.data.centerId,
    loader: ({ params: id }) => this.indoor.getCenterTopos(id),
  });

  protected readonly model = signal<{
    name: string;
    climbing_kind: 'sport' | 'boulder';
    gradeLabel: string;
    color: string;
    topo: IndoorTopoDto | null;
    legacy: boolean;
  }>({
    name: '',
    climbing_kind: 'sport',
    gradeLabel: '4a',
    color: '',
    topo: null,
    legacy: false,
  });

  protected readonly rForm = form(this.model, (path) => {
    required(path.name);
  });

  constructor() {
    const data = this.context.data.routeData;
    if (data) {
      this.model.set({
        name: data.name,
        climbing_kind: (data.climbing_kind as 'sport' | 'boulder') || 'sport',
        gradeLabel: ORDERED_GRADE_VALUES[data.grade || 0] || '4a',
        color: data.color || '',
        topo: null, // will be matched below once resource loads
        legacy: !!data.legacy,
      });

      // Match topo
      effect(() => {
        const toposList = this.topos();
        if (toposList.length > 0 && data.topo_id) {
          const matched = toposList.find((t) => t.id === data.topo_id);
          if (matched) {
            this.model.update((m) => ({ ...m, topo: matched }));
          }
        }
      });
    }
  }

  protected onCancel(): void {
    this.context.completeWith(false);
  }

  protected onSubmit(): void {
    submit(this.rForm, async () => {
      this.isSaving.set(true);
      try {
        const m = this.model();
        const gradeIndex = ORDERED_GRADE_VALUES.indexOf(m.gradeLabel as any);
        const payload = {
          center_id: this.context.data.centerId,
          name: m.name,
          slug: slugify(m.name),
          climbing_kind: m.climbing_kind,
          grade: gradeIndex >= 0 ? gradeIndex : 0,
          color: m.color || null,
          topo_id: m.topo?.id || null,
          legacy: m.legacy,
        };

        if (this.context.data.routeData) {
          await this.indoor.updateRoute(
            this.context.data.routeData.id,
            payload,
          );
          this.toast.success('routes.updateSuccess');
        } else {
          await this.indoor.createRoute(payload);
          this.toast.success('routes.createSuccess');
        }
        this.context.completeWith(true);
      } catch (e) {
        console.error('[IndoorRouteFormComponent] Error saving route:', e);
        this.toast.error('errors.unexpected');
      } finally {
        this.isSaving.set(false);
      }
    });
  }
}
