import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  type TuiDialogContext,
  TuiDataList,
  TuiFilterByInputPipe,
} from '@taiga-ui/core';
import {
  TuiButton,
  TuiLabel,
  TuiInput,
  TuiError,
  TuiDropdown,
  TuiCheckbox,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiSelect,
  TuiDataListWrapper,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiPin,
} from '@taiga-ui/kit';
import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IndoorService } from '../../services/indoor.service';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';
import {
  IndoorRouteDto,
  IndoorTopoDto,
  GRADE_NUMBER_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  EquipperDto,
  ClimbingKind,
  ClimbingKinds,
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

      <tui-textfield tuiChevron [tuiTextfieldCleaner]="false">
        <label tuiLabel for="climbing_kind">
          {{ 'climbing_kind' | translate }}
        </label>
        <select
          tuiSelect
          id="climbing_kind"
          [ngModel]="model().climbing_kind"
          (ngModelChange)="updateModel('climbing_kind', $event)"
          name="climbing_kind"
        >
          @for (kind of kindOptions; track kind) {
            <option [ngValue]="kind">
              {{ 'climbingKinds.' + kind | translate }}
            </option>
          }
        </select>
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
          class="grow min-w-0"
        >
          <label tuiLabel for="grade">
            {{ 'grade' | translate }}
          </label>
          <select
            tuiSelect
            id="grade"
            [ngModel]="model().grade"
            (ngModelChange)="updateModel('grade', $event)"
            name="grade"
          >
            @for (grade of gradeOptions; track grade) {
              <option [ngValue]="grade">
                {{ gradeStringify(grade) }}
              </option>
            }
          </select>
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
          @for (color of routeColors; track color) {
            <button tuiOption [value]="color">
              <div class="flex items-center gap-2">
                <div tuiPin [style.backgroundColor]="color"></div>
                <span>{{ 'colors.' + color | translate }}</span>
              </div>
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      @if (topos().length > 0) {
        <tui-textfield tuiChevron [tuiTextfieldCleaner]="true">
          <label tuiLabel for="topo">{{ 'topo' | translate }}</label>
          <select
            tuiSelect
            id="topo"
            [ngModel]="model().topo"
            (ngModelChange)="updateModel('topo', $event)"
            name="topo"
          >
            <option [ngValue]="null">--</option>
            @for (topo of topos(); track topo.id) {
              <option [ngValue]="topo">
                {{ topo.name }}
              </option>
            }
          </select>
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
          #chipInput
          tuiInputChip
          id="equippers"
          [ngModel]="model().equippers"
          (ngModelChange)="onEquippersChange($event)"
          name="equippers"
          (input)="searchQuery.set(chipInput.value)"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiDropdown>
          @let items = allEquippers.value() || [];
          @if (searchQuery().length > 2) {
            @for (
              item of items | tuiHideSelected | tuiFilterByInput;
              track item.name
            ) {
              <button tuiOption [value]="item">
                {{ item.name }}
              </button>
            }
          } @else {
            <div class="p-2 text-sm opacity-60 text-center">
              {{ 'search' | translate }}
            </div>
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
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);

  private readonly context =
    injectContext<TuiDialogContext<boolean, IndoorRouteFormData>>();

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

  protected readonly colorStringify = (color: string): string => color;

  protected readonly routeColors = [
    '#EF4444', // Red 500
    '#3B82F6', // Blue 500
    '#F97316', // Orange 500
    '#06B6D4', // Cyan 500
    '#EAB308', // Yellow 500
    '#22C55E', // Green 500
    '#EC4899', // Pink 500
    '#A855F7', // Fuchsia 500
    '#ffffff', // White
    '#000000', // Black
    '#6B7280', // Gray 500
    '#84CC16', // Lime 500
    '#14B8A6', // Teal 500
    '#6366F1', // Emerald 500
    '#8B5CF6', // Indigo 500
    '#D946EF', // Rose 500
  ];

  protected readonly stringifyTopo = (t: IndoorTopoDto) => t.name;

  protected readonly topos = computed(() => this.toposResource.value() || []);

  protected readonly toposResource = resource({
    params: () => this.context.data.centerId,
    loader: async ({ params: id }) => {
      if (!id) return [];
      try {
        return await this.indoor.getCenterTopos(id);
      } catch (e: any) {
        console.error('[IndoorRouteFormComponent] Error loading topos:', e);
        throw new Error(e?.message || 'Error loading topos');
      }
    },
  });

  protected readonly searchQuery = signal('');

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
    climbing_kind: 'sport',
    grade: 6,
    color: 'red',
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

  protected readonly allEquippers = resource<EquipperDto[], { query: string }>({
    params: () => ({ query: this.searchQuery() }),
    loader: async ({ params: { query } }) => {
      if (!query || query.length <= 2 || !isPlatformBrowser(this.platformId))
        return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('equippers')
          .select('*')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(20);
        if (error) throw error;
        return (data as EquipperDto[]) || [];
      } catch (e: any) {
        console.error('[IndoorRouteFormComponent] Error loading equippers:', e);
        throw new Error(e?.message || 'Error loading equippers');
      }
    },
  });

  constructor() {
    const data = this.context.data.routeData;
    if (data) {
      this.model.set({
        name: data.name,
        climbing_kind: (data.climbing_kind as ClimbingKind) || 'sport',
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
        const payload = {
          center_id: this.context.data.centerId,
          name: m.name,
          slug: slugify(m.name),
          climbing_kind: m.climbing_kind,
          grade: m.grade,
          color: m.color || null,
          topo_id: m.topo?.id || null,
          legacy: m.legacy,
        };

        let savedRouteId = this.context.data.routeData?.id;

        if (this.context.data.routeData) {
          await this.indoor.updateRoute(
            this.context.data.routeData.id,
            payload,
          );
          this.toast.success('messages.toasts.routeUpdated');
        } else {
          const result = await this.indoor.createRoute(payload);
          if (result) {
            savedRouteId = result.id;
          }
          this.toast.success('messages.toasts.routeCreated');
        }

        if (savedRouteId) {
          await this.indoor.setRouteEquippers(savedRouteId, m.equippers);
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
