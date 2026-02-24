import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { CragsService, GlobalData } from '../services';
import { CragDto } from '../models';

@Component({
  selector: 'app-crag-unify',
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
        {{ 'crags.unifyDescription' | translate }}
      </p>

      <tui-textfield tuiChevron class="block" [stringify]="stringify">
        <label tuiLabel for="target-crag">{{
          'crags.targetCrag' | translate
        }}</label>
        <input
          tuiComboBox
          id="target-crag"
          autocomplete="off"
          [formControl]="targetCrag"
          [placeholder]="'select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (crag of availableCrags() | tuiFilterByInput; track crag.id) {
            <button tuiOption new [value]="crag">
              {{ crag.name }}
            </button>
          }
        </tui-data-list>
        @if (targetCrag.invalid && targetCrag.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <tui-textfield
        tuiChevron
        multi
        class="block"
        [stringify]="stringify"
        [disabledItemHandler]="isInvalidCrag"
      >
        <label tuiLabel for="source-crags">{{
          'crags.sourceCrags' | translate
        }}</label>
        <input
          tuiInputChip
          id="source-crags"
          autocomplete="off"
          [formControl]="sourceCrags"
          [placeholder]="'select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiTextfieldDropdown>
          <tui-opt-group tuiMultiSelectGroup>
            @for (
              crag of availableSources() | tuiFilterByInput;
              track crag.id
            ) {
              <button tuiOption new [value]="crag">
                {{ crag.name }}
              </button>
            }
          </tui-opt-group>
        </tui-data-list>
        @if (sourceCrags.invalid && sourceCrags.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{ 'crags.newName' | translate }}</label>
        <input
          tuiTextfield
          id="new-name"
          autocomplete="off"
          [formControl]="newName"
          type="text"
          [placeholder]="targetCrag.value?.name || ''"
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
            targetCrag.invalid ||
            (sourceCrags.value?.length || 0) === 0 ||
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
export class CragUnifyComponent {
  protected readonly global = inject(GlobalData);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, { candidates?: CragDto[] }>>();
  private readonly cragsService = inject(CragsService);

  protected readonly loading = signal(false);

  targetCrag = new FormControl<CragDto | null>(null, Validators.required);
  sourceCrags = new FormControl<CragDto[]>([], Validators.required);
  newName = new FormControl<string>('');

  constructor() {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      this.targetCrag.setValue(candidates[0]);
      if (candidates.length > 1) {
        this.sourceCrags.setValue(candidates.slice(1));
      }
    }
  }

  protected readonly availableCrags = computed(() => {
    const candidates = this.context.data?.candidates ?? [];
    const globalList = this.global.cragsList();
    const map = new Map();
    // Prioritize candidates
    candidates.forEach((c) => map.set(c.id, c));
    // Add global items if not present
    globalList.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()) as CragDto[];
  });

  protected readonly isInvalidCrag = (item: CragDto): boolean =>
    !this.availableCrags().some((a) => a.id === item.id);

  protected readonly stringify = (crag: CragDto) => crag.name;

  protected availableSources() {
    const targetId = this.targetCrag.value?.id;
    return this.availableCrags().filter((a) => a.id !== targetId);
  }

  async onUnify() {
    const target = this.targetCrag.value;
    const sources = this.sourceCrags.value;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.cragsService.unify(
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
