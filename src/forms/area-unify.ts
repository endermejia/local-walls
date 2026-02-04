import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiLabel,
  TuiOptGroup,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiComboBox,
  TuiMultiSelect,
} from '@taiga-ui/kit';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { AreasService, GlobalData } from '../services';
import { AreaDto, AreaListItem } from '../models';

@Component({
  selector: 'app-area-unify',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
          [formControl]="targetArea"
          [placeholder]="'actions.select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (area of global.areaList() | tuiFilterByInput; track area.id) {
            <button tuiOption new [value]="area">
              {{ area.name }}
            </button>
          }
        </tui-data-list>
        @if (targetArea.invalid && targetArea.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

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
          [formControl]="sourceAreas"
          [placeholder]="'actions.select' | translate"
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
        @if (sourceAreas.invalid && sourceAreas.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{ 'areas.newName' | translate }}</label>
        <input
          tuiTextfield
          id="new-name"
          autocomplete="off"
          [formControl]="newName"
          type="text"
          [placeholder]="targetArea.value?.name || ''"
        />
      </tui-textfield>

      <div class="flex justify-end gap-2 mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click)="context.completeWith(false)"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary"
          [disabled]="
            targetArea.invalid ||
            (sourceAreas.value?.length || 0) === 0 ||
            loading()
          "
          (click)="onUnify()"
        >
          {{ 'actions.unify' | translate }}
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

  targetArea = new FormControl<AreaDto | null>(null, Validators.required);
  sourceAreas = new FormControl<AreaDto[]>([], Validators.required);
  newName = new FormControl<string>('');

  constructor() {
    const initialAreas = this.context.data;
    if (initialAreas && initialAreas.length > 0) {
      // Set the first area as target and the rest as sources
      this.targetArea.setValue(initialAreas[0] as AreaDto);
      if (initialAreas.length > 1) {
        this.sourceAreas.setValue(initialAreas.slice(1) as AreaDto[]);
      }
    }
  }

  protected readonly isInvalidArea = (item: AreaDto): boolean =>
    !this.global.areaList().some((a) => a.id === item.id);

  protected readonly stringify = (area: AreaDto) => area.name;

  protected availableSources() {
    const targetId = this.targetArea.value?.id;
    return this.global.areaList().filter((a) => a.id !== targetId);
  }

  async onUnify() {
    const target = this.targetArea.value;
    const sources = this.sourceAreas.value;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.areasService.unify(
      target.id,
      sources.map((s) => s.id),
      this.newName.value || target.name,
    );
    this.loading.set(false);

    if (success) {
      this.context.completeWith(true);
    }
  }
}
