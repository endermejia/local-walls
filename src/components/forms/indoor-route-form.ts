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
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit } from '@angular/forms/signals';

import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import {
  type TuiDialogContext,
  TuiButton,
  TuiCheckbox,
  TuiDataList,
  TuiDropdown,
  TuiError,
  TuiFilterByInputPipe,
  TuiInput,
  TuiLabel,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiPin,
  TuiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import {
  ClimbingKind,
  ClimbingKinds,
  EquipperDto,
  GRADE_NUMBER_TO_LABEL,
  INDOOR_ROUTE_COLORS,
  INDOOR_ROUTE_COLORS_LIST,
  IndoorRouteDto,
  IndoorTopoDto,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { handleErrorToast, matchesQuery, slugify } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

export interface IndoorRouteFormData {
  centerId: string;
  routeData?: IndoorRouteDto;
  hideTopo?: boolean;
  defaultTopoId?: string;
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
    TuiDataList,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TuiInputChip,
    TuiPin,
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

      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="kindStringify"
      >
        <label tuiLabel for="climbing_kind">
          {{ 'climbing_kind' | translate }}
        </label>
        <input
          tuiSelect
          id="climbing_kind"
          [ngModel]="model().climbing_kind"
          (ngModelChange)="updateModel('climbing_kind', $event)"
          name="climbing_kind"
          autocomplete="off"
        />
        <tui-data-list-wrapper *tuiDropdown new [items]="kindOptions" />
      </tui-textfield>

      <div class="flex items-center gap-2">
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.minus"
          class="rounded-full! shrink-0"
          (click)="changeGrade(-1)"
        >
          -
        </button>
        <tui-textfield
          tuiChevron
          [tuiTextfieldCleaner]="false"
          [stringify]="gradeStringify"
          class="grow min-w-0"
        >
          <label tuiLabel for="grade">
            {{ 'grade' | translate }}
          </label>
          <input
            tuiSelect
            id="grade"
            [ngModel]="model().grade"
            (ngModelChange)="updateModel('grade', $event)"
            name="grade"
            autocomplete="off"
          />
          <tui-data-list-wrapper *tuiDropdown new [items]="gradeOptions" />
        </tui-textfield>
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.plus"
          class="rounded-full! shrink-0"
          (click)="changeGrade(1)"
        >
          +
        </button>
      </div>

      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="colorStringify"
      >
        <label tuiLabel for="color">
          {{ 'color' | translate }}
        </label>
        <input
          tuiSelect
          id="color"
          [ngModel]="model().color"
          (ngModelChange)="updateModel('color', $event)"
          name="color"
          autocomplete="off"
        />
        <tui-data-list *tuiDropdown>
          @for (color of routeColorsList; track color.value) {
            <button tuiOption [value]="color.value">
              <div class="flex items-center gap-2">
                <div
                  tuiPin
                  [style.backgroundColor]="color.value"
                  style="position: static; transform: scale(0.75); margin: 0;"
                  class="shrink-0"
                ></div>
                <span>{{ 'colors.' + color.name | translate }}</span>
              </div>
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      @if (!hideTopo() && topos().length > 0) {
        <tui-textfield
          tuiChevron
          [tuiTextfieldCleaner]="true"
          [stringify]="stringifyTopo"
          [identityMatcher]="topoIdentityMatcher"
        >
          <label tuiLabel for="topo">{{ 'topo' | translate }}</label>
          <input
            tuiSelect
            id="topo"
            [ngModel]="model().topo"
            (ngModelChange)="updateModel('topo', $event)"
            name="topo"
            autocomplete="off"
          />
          <tui-data-list-wrapper *tuiDropdown new [items]="topos()" />
        </tui-textfield>
      }

      <tui-textfield
        multi
        tuiChevron
        [tuiTextfieldCleaner]="true"
        [stringify]="equipperStringify"
        [identityMatcher]="equipperIdentityMatcher"
      >
        <label tuiLabel for="equippers">
          {{ 'equippers' | translate }}
        </label>
        <input
          tuiInputChip
          id="equippers"
          [ngModel]="model().equippers"
          (ngModelChange)="onEquippersChange($event)"
          name="equippers"
          [placeholder]="'select' | translate"
          autocomplete="off"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiDropdown>
          @for (
            item of allEquippers.value() || []
              | tuiHideSelected
              | tuiFilterByInput: equipperFilter;
            track item.id
          ) {
            <button tuiOption [value]="item">
              {{ item.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      <label class="flex items-center gap-2 mt-2">
        <input
          tuiCheckbox
          type="checkbox"
          [ngModel]="model().legacy"
          (ngModelChange)="updateModel('legacy', $event)"
          name="legacy"
        />
        <span>{{ 'indoor.legacy' | translate }}</span>
      </label>

      <footer class="flex flex-wrap gap-2 justify-end items-center mt-4">
        <button
          appearance="flat"
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
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);

  private readonly context =
    injectContext<
      TuiDialogContext<boolean | IndoorRouteDto, IndoorRouteFormData>
    >();

  protected readonly hideTopo = computed(() => !!this.context.data.hideTopo);
  protected readonly isSaving = signal(false);
  protected readonly gradeOptions: readonly number[] = Object.keys(
    GRADE_NUMBER_TO_LABEL,
  )
    .map(Number)
    .sort((a, b) => a - b);

  protected readonly gradeStringify = (grade: number): string =>
    grade === 0
      ? this.translate.instant('project')
      : GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || '';

  protected readonly kindOptions: readonly ClimbingKind[] =
    Object.values(ClimbingKinds);
  protected readonly kindStringify = (kind: ClimbingKind): string =>
    this.translate.instant(`climbingKinds.${kind}`);

  protected readonly colorStringify = (colorValue: string): string => {
    const name = INDOOR_ROUTE_COLORS[colorValue];
    return name ? this.translate.instant('colors.' + name) : colorValue;
  };

  protected readonly routeColorsList = INDOOR_ROUTE_COLORS_LIST;

  protected readonly stringifyTopo = (
    t: IndoorTopoDto | null | undefined,
  ): string => t?.name || '';

  protected readonly topoIdentityMatcher: TuiIdentityMatcher<
    IndoorTopoDto | null | undefined
  > = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.id === b.id;
  };

  protected readonly topos = computed(() => this.toposResource.value() || []);

  protected readonly toposResource = resource({
    params: () =>
      this.context.data.centerId || this.context.data.routeData?.center_id,
    loader: async ({ params: id }) => {
      if (!id) return [];
      try {
        return await this.indoor.getCenterTopos(id);
      } catch (e: unknown) {
        console.error('[IndoorRouteFormComponent] Error loading topos:', e);
        throw new Error(e instanceof Error ? e.message : 'Error loading topos');
      }
    },
  });

  protected readonly model = signal<{
    name: string;
    climbing_kind: ClimbingKind;
    grade: number;
    color: string;
    topo: IndoorTopoDto | null;
    legacy: boolean;
    equippers: (EquipperDto | string)[];
  }>({
    name: '',
    climbing_kind: ClimbingKinds.SPORT,
    grade: 6,
    color: '#EF4444',
    topo: null,
    legacy: false,
    equippers: [],
  });

  protected readonly rForm = form(this.model, (path) => {
    required(path.name);
  });

  changeGrade(delta: number): void {
    const current = this.model().grade;
    const currentIndex = this.gradeOptions.indexOf(current);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < this.gradeOptions.length) {
      this.model.update((m) => ({ ...m, grade: this.gradeOptions[nextIndex] }));
    }
  }

  updateModel<K extends keyof ReturnType<typeof this.model>>(
    key: K,
    value: ReturnType<typeof this.model>[K],
  ): void {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  protected readonly equipperStringify = (
    item: EquipperDto | string,
  ): string => (typeof item === 'string' ? item : item.name);

  protected readonly equipperIdentityMatcher: TuiIdentityMatcher<
    EquipperDto | string
  > = (a, b) => {
    if (a === b) return true;
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    return a.id === b.id;
  };

  protected readonly equipperFilter = (
    items: readonly EquipperDto[],
    search: string,
    stringify?: (item: EquipperDto) => string,
  ): readonly EquipperDto[] =>
    items.filter((item) =>
      matchesQuery(stringify ? stringify(item) : item.name, search),
    );

  protected readonly allEquippers = resource<EquipperDto[], undefined>({
    loader: async () => {
      if (!this.isBrowser) return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('equippers')
          .select('*')
          .order('name');
        if (error) throw error;
        return (data as EquipperDto[]) || [];
      } catch (e: unknown) {
        console.error('[IndoorRouteFormComponent] Error loading equippers:', e);
        throw new Error(
          e instanceof Error ? e.message : 'Error loading equippers',
        );
      }
    },
  });

  constructor() {
    const data = this.context.data.routeData;
    if (data) {
      this.model.set({
        name: data.name,
        climbing_kind:
          (data.climbing_kind as ClimbingKind) || ClimbingKinds.SPORT,
        grade: data.grade || 6,
        color: data.color || '',
        topo: null, // will be matched below once resource loads
        legacy: !!data.legacy,
        equippers: [],
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

      // Load existing equippers
      this.indoor.getRouteEquippers(data.id).then((equippers) => {
        this.model.update((m) => ({ ...m, equippers }));
      });
    } else if (this.context.data.defaultTopoId) {
      const defId = this.context.data.defaultTopoId;
      effect(() => {
        const toposList = this.topos();
        if (toposList.length > 0 && defId) {
          const matched = toposList.find((t) => String(t.id) === String(defId));
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

  onEquippersChange(equippers: (EquipperDto | string)[]): void {
    this.model.update((m) => ({ ...m, equippers }));
  }

  protected onSubmit(): void {
    submit(this.rForm, async () => {
      this.isSaving.set(true);
      try {
        const m = this.model();
        const assignedTopoId =
          this.context.data.defaultTopoId || m.topo?.id || null;
        const payload = {
          center_id: this.context.data.centerId,
          name: m.name,
          slug: slugify(m.name),
          climbing_kind: m.climbing_kind,
          grade: m.grade,
          color: m.color || null,
          topo_id: assignedTopoId,
          legacy: m.legacy,
        };

        let savedRouteId = this.context.data.routeData?.id;
        let savedRoute: IndoorRouteDto | null = null;

        if (this.context.data.routeData) {
          await this.indoor.updateRoute(
            this.context.data.routeData.id,
            payload,
          );
          savedRoute = { ...this.context.data.routeData, ...payload };
          this.toast.success('messages.toasts.routeUpdated');
        } else {
          const result = await this.indoor.createRoute(payload);
          if (result) {
            savedRoute = result;
            savedRouteId = result.id;
          }
          this.toast.success('messages.toasts.routeCreated');
        }

        if (savedRouteId) {
          await this.indoor.setRouteEquippers(savedRouteId, m.equippers);
          if (assignedTopoId && !this.context.data.hideTopo) {
            await this.supabase.client.from('indoor_topo_routes').upsert({
              topo_id: assignedTopoId,
              route_id: savedRouteId,
              number: 0,
              path: null,
            });
          }
        }

        this.context.completeWith(savedRoute ?? true);
      } catch (e) {
        console.error('[IndoorRouteFormComponent] Error saving route:', e);
        handleErrorToast(e, this.toast);
      } finally {
        this.isSaving.set(false);
      }
    });
  }
}
