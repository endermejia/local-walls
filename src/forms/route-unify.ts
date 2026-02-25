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

import { GlobalData } from '../services/global-data';
import { RoutesService } from '../services/routes.service';

import { RouteDto } from '../models';

@Component({
  selector: 'app-route-unify',
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
          [ngModel]="model().targetRoute"
          (ngModelChange)="onTargetRouteChange($event)"
          name="targetRoute"
          [placeholder]="'select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (route of cragRoutes() | tuiFilterByInput; track route.id) {
            <button tuiOption new [value]="route">
              {{ route.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>
      @if (
        unifyForm.targetRoute().invalid() && unifyForm.targetRoute().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

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
          [ngModel]="model().sourceRoutes"
          (ngModelChange)="onSourceRoutesChange($event)"
          name="sourceRoutes"
          [placeholder]="'select' | translate"
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
      </tui-textfield>
      @if (
        unifyForm.sourceRoutes().invalid() && unifyForm.sourceRoutes().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{
          'routes.newName' | translate
        }}</label>
        <input
          tuiTextfield
          id="new-name"
          autocomplete="off"
          [formField]="$any(unifyForm.newName)"
          type="text"
          [placeholder]="model().targetRoute?.name || ''"
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
            unifyForm.targetRoute().invalid() ||
            model().sourceRoutes.length === 0 ||
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
export class RouteUnifyComponent {
  protected readonly global = inject(GlobalData);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, { candidates?: RouteDto[] }>>();
  private readonly routesService = inject(RoutesService);

  protected readonly loading = signal(false);

  model = signal<{
    targetRoute: RouteDto | null;
    sourceRoutes: RouteDto[];
    newName: string | null;
  }>({
    targetRoute: null,
    sourceRoutes: [],
    newName: null,
  });

  unifyForm = form(this.model, (schemaPath) => {
    required(schemaPath.targetRoute);
    required(schemaPath.sourceRoutes);
  });

  constructor() {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      this.model.update((m) => ({
        ...m,
        targetRoute: candidates[0],
        sourceRoutes: candidates.length > 1 ? candidates.slice(1) : [],
      }));
    }
  }

  protected readonly cragRoutes = computed(() => {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      return candidates;
    }
    return this.global.cragRoutesResource.value() ?? [];
  });

  protected readonly isInvalidRoute = (item: RouteDto): boolean =>
    !this.cragRoutes().some((a) => a.id === item.id);

  protected readonly stringify = (route: RouteDto) => route.name;

  protected availableSources() {
    const targetId = this.model().targetRoute?.id;
    return this.cragRoutes().filter((a) => a.id !== targetId);
  }

  onTargetRouteChange(route: RouteDto | null): void {
    this.model.update((m) => ({ ...m, targetRoute: route }));
  }

  onSourceRoutesChange(routes: RouteDto[]): void {
    this.model.update((m) => ({ ...m, sourceRoutes: routes }));
  }

  async onUnify() {
    const target = this.model().targetRoute;
    const sources = this.model().sourceRoutes;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.routesService.unify(
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
