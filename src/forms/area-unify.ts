import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';

import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiLabel,
  TuiOptGroup,
  TuiTextfield,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiChevron,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiComboBox,
  TuiMultiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../services/areas.service';
import { GlobalData } from '../services/global-data';

import { AreaDto, AreaListItem } from '../models';

@Component({
  selector: 'app-area-unify',
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiError,
    TuiFilterByInputPipe,
    TuiInputChip,
    TuiLabel,
    TuiMultiSelect,
    TuiOptGroup,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <p class="text-sm opacity-70">
        {{ 'areas.unifyDescription' | translate }}
      </p>

      <tui-textfield tuiChevron class="block" [stringify]="stringify">
        <label tuiLabel for="target-area">{{
          'areas.targetArea' | translate
        }}</label>
        <input
          tuiComboBox
          id="target-area"
          autocomplete="off"
          [ngModel]="model().targetArea"
          (ngModelChange)="onTargetAreaChange($event)"
          name="targetArea"
          [placeholder]="'select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (area of availableAreas() | tuiFilterByInput; track area.id) {
            <button tuiOption new [value]="area">
              {{ area.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>
      @if (
        unifyForm.targetArea().invalid() && unifyForm.targetArea().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield
        tuiChevron
        multi
        class="block"
        [stringify]="stringify"
        [disabledItemHandler]="isInvalidArea"
      >
        <label tuiLabel for="source-areas">{{
          'areas.sourceAreas' | translate
        }}</label>
        <input
          tuiInputChip
          id="source-areas"
          autocomplete="off"
          [ngModel]="model().sourceAreas"
          (ngModelChange)="onSourceAreasChange($event)"
          name="sourceAreas"
          [placeholder]="'select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiTextfieldDropdown>
          <tui-opt-group tuiMultiSelectGroup>
            @for (
              area of availableSources() | tuiFilterByInput;
              track area.id
            ) {
              <button tuiOption new [value]="area">
                {{ area.name }}
              </button>
            }
          </tui-opt-group>
        </tui-data-list>
      </tui-textfield>
      @if (
        unifyForm.sourceAreas().invalid() && unifyForm.sourceAreas().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{ 'areas.newName' | translate }}</label>
        <input
          tuiTextfield
          id="new-name"
          autocomplete="off"
          [formField]="$any(unifyForm.newName)"
          type="text"
          [placeholder]="model().targetArea?.name || ''"
        />
      </tui-textfield>

      <div class="flex justify-end gap-2 mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click)="context.completeWith(false)"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary"
          [disabled]="
            unifyForm.targetArea().invalid() ||
            model().sourceAreas.length === 0 ||
            loading()
          "
          (click)="onUnify()"
        >
          {{ 'unify' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class AreaUnifyComponent {
  protected readonly global = inject(GlobalData);
  protected readonly context =
    injectContext<
      TuiDialogContext<boolean, AreaDto[] | AreaListItem[] | undefined>
    >();
  private readonly areasService = inject(AreasService);

  protected readonly loading = signal(false);

  model = signal<{
    targetArea: AreaDto | null;
    sourceAreas: AreaDto[];
    newName: string | null;
  }>({
    targetArea: null,
    sourceAreas: [],
    newName: null,
  });

  unifyForm = form(this.model, (schemaPath) => {
    required(schemaPath.targetArea);
    required(schemaPath.sourceAreas);
  });

  constructor() {
    const initialAreas = this.context.data;
    if (initialAreas && initialAreas.length > 0) {
      // Set the first area as target and the rest as sources
      this.model.update((m) => ({
        ...m,
        targetArea: initialAreas[0] as AreaDto,
        sourceAreas:
          initialAreas.length > 1 ? (initialAreas.slice(1) as AreaDto[]) : [],
      }));
    }
  }

  protected readonly availableAreas = computed(() => {
    const candidates = this.context.data;
    const globalList = this.global.areaList();
    const map = new Map();
    // Prioritize candidates
    if (candidates && candidates.length > 0) {
      candidates.forEach((c) => map.set(c.id, c));
    }
    // Add global items if not present
    globalList.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()) as AreaDto[];
  });

  protected readonly isInvalidArea = (item: AreaDto): boolean =>
    !this.availableAreas().some((a) => a.id === item.id);

  protected readonly stringify = (area: AreaDto) => area.name;

  protected availableSources() {
    const targetId = this.model().targetArea?.id;
    return this.availableAreas().filter((a) => a.id !== targetId);
  }

  onTargetAreaChange(area: AreaDto | null): void {
    this.model.update((m) => ({ ...m, targetArea: area }));
  }

  onSourceAreasChange(areas: AreaDto[]): void {
    this.model.update((m) => ({ ...m, sourceAreas: areas }));
  }

  async onUnify() {
    const target = this.model().targetArea;
    const sources = this.model().sourceAreas;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.areasService.unify(
      target.id,
      sources.map((s) => s.id),
      this.model().newName || target.name,
    );
    this.loading.set(false);

    if (success) {
      this.context.completeWith(true);
    }
  }
}
