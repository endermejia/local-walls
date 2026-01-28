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
import { RoutesService, GlobalData } from '../services';
import { RouteDto } from '../models';

@Component({
  selector: 'app-route-unify',
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
        {{ 'routes.unifyDescription' | translate }}
      </p>

      <tui-textfield tuiChevron class="block" [stringify]="stringify">
        <label tuiLabel for="target-route">{{
          'routes.targetRoute' | translate
        }}</label>
        <input
          tuiComboBox
          id="target-route"
          autocomplete="off"
          [formControl]="targetRoute"
          [placeholder]="'actions.select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (route of cragRoutes() | tuiFilterByInput; track route.id) {
            <button tuiOption new [value]="route">
              {{ route.name }}
            </button>
          }
        </tui-data-list>
        @if (targetRoute.invalid && targetRoute.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <tui-textfield
        tuiChevron
        multi
        class="block"
        [stringify]="stringify"
        [disabledItemHandler]="isInvalidRoute"
      >
        <label tuiLabel for="source-routes">{{
          'routes.sourceRoutes' | translate
        }}</label>
        <input
          tuiInputChip
          id="source-routes"
          autocomplete="off"
          [formControl]="sourceRoutes"
          [placeholder]="'actions.select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiTextfieldDropdown>
          <tui-opt-group tuiMultiSelectGroup>
            @for (
              route of availableSources() | tuiFilterByInput;
              track route.id
            ) {
              <button tuiOption new [value]="route">
                {{ route.name }}
              </button>
            }
          </tui-opt-group>
        </tui-data-list>
        @if (sourceRoutes.invalid && sourceRoutes.touched) {
          <tui-error [error]="'errors.required' | translate" />
        }
      </tui-textfield>

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{
          'routes.newName' | translate
        }}</label>
        <input
          tuiTextfield
          id="new-name"
          autocomplete="off"
          [formControl]="newName"
          type="text"
          [placeholder]="targetRoute.value?.name || ''"
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
            targetRoute.invalid ||
            (sourceRoutes.value?.length || 0) === 0 ||
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
export class RouteUnifyComponent {
  protected readonly global = inject(GlobalData);
  protected readonly context = injectContext<TuiDialogContext<boolean, void>>();
  private readonly routesService = inject(RoutesService);

  protected readonly loading = signal(false);

  targetRoute = new FormControl<RouteDto | null>(null, Validators.required);
  sourceRoutes = new FormControl<RouteDto[]>([], Validators.required);
  newName = new FormControl<string>('');

  protected readonly cragRoutes = computed(
    () => this.global.cragRoutesResource.value() ?? [],
  );

  protected readonly isInvalidRoute = (item: RouteDto): boolean =>
    !this.cragRoutes().some((a) => a.id === item.id);

  protected readonly stringify = (route: RouteDto) => route.name;

  protected availableSources() {
    const targetId = this.targetRoute.value?.id;
    return this.cragRoutes().filter((a) => a.id !== targetId);
  }

  async onUnify() {
    const target = this.targetRoute.value;
    const sources = this.sourceRoutes.value;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.routesService.unify(
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
