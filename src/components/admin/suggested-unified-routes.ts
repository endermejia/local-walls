import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  TuiButton,
  TuiDataList,
  TuiLoader,
  TuiError,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiComboBox, TuiFilterByInputPipe } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { AreasService, RoutesService } from '../../services';
import { normalizeName } from '../../utils';
import { RouteDto } from '../../models';

@Component({
  selector: 'app-suggested-unified-routes',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiComboBox,
    TuiDataList,
    TuiError,
    TuiFilterByInputPipe,
    TuiLoader,
    TuiTextfield,
    TranslatePipe,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <h3 class="font-bold text-lg">
        {{ 'routes.suggestedDuplicates' | translate }}
      </h3>

      <tui-textfield tuiChevron class="block" [stringify]="stringifyArea">
        <label tuiLabel for="select-area">
          {{ 'areas.title' | translate }}
        </label>
        <input
          tuiComboBox
          id="select-area"
          [formControl]="areaControl"
          [placeholder]="'actions.select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (area of areas() | tuiFilterByInput; track area.id) {
            <button tuiOption new [value]="area">
              {{ area.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      @if (routesResource.isLoading()) {
        <div class="flex justify-center p-4">
          <tui-loader class="m-auto" />
        </div>
      } @else if (areaControl.value && duplicates().length === 0) {
        <p class="opacity-70">{{ 'admin.noDuplicatesFound' | translate }}</p>
      } @else if (!areaControl.value) {
        <p class="opacity-70">{{ 'admin.selectAreaToScan' | translate }}</p>
      } @else {
        <div class="grid gap-2">
          @for (group of duplicates(); track $index) {
            <div
              class="border border-[var(--tui-border-normal)] p-4 rounded-xl flex items-center justify-between gap-4"
            >
              <div>
                <div class="font-bold">
                  {{ group[0].name }}
                </div>
                <div class="text-sm opacity-70">
                  {{ group.length }} {{ 'labels.items' | translate }} ({{
                    getCragNames(group)
                  }})
                </div>
              </div>
              <button
                tuiButton
                size="m"
                appearance="primary"
                (click)="onUnify(group)"
              >
                {{ 'actions.unify' | translate }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedUnifiedRoutesComponent {
  private readonly areasService = inject(AreasService);
  private readonly routesService = inject(RoutesService);

  areaControl = new FormControl<{ id: number; name: string } | null>(null);

  protected readonly selectedArea = toSignal(this.areaControl.valueChanges);

  // Need area list for dropdown
  protected readonly areasResource = resource({
    loader: () => this.areasService.getAllAreasSimple(),
  });
  protected readonly areas = computed(() => this.areasResource.value() ?? []);

  protected readonly routesResource = resource({
    params: () => this.selectedArea()?.id,
    loader: async ({ params: id }) => {
      if (!id) return [];
      return this.routesService.getRoutesByAreaSimple(id);
    },
  });

  protected readonly duplicates = computed(() => {
    const routes = this.routesResource.value() ?? [];
    const groups = new Map<string, any[]>();

    for (const route of routes) {
      const key = normalizeName(route.name);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(route);
    }

    return Array.from(groups.values()).filter((g) => g.length > 1);
  });

  protected readonly stringifyArea = (item: { name: string }) => item.name;

  protected getCragNames(group: any[]): string {
    return group.map((a) => a.crag?.name || 'Unknown').join(', ');
  }

  protected onUnify(group: any[]) {
    this.routesService.openUnifyRoutes(group as unknown as RouteDto[]);
  }
}
