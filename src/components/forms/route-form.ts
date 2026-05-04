import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  untracked,
} from '@angular/core';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiLabel,
  TuiInput,
  TuiFilterByInputPipe,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiInputNumber,
  TuiComboBox,
  TuiSelect,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { CounterComponent } from '../ui/counter';

import {
  ClimbingKind,
  ClimbingKinds,
  AreaDto,
  CragDto,
  EquipperDto,
  RouteDto,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../../models';

import { handleErrorToast, slugify } from '../../utils';

interface MinimalRoute {
  id?: number;
  crag_id?: number;
  name: string;
  slug?: string;
  grade?: number;
  climbing_kind?: ClimbingKind;
  height?: number | null;
  eight_anu_route_slugs?: string[] | null;
}

interface RouteFormModel {
  name: string;
  area: AreaDto | null;
  crag: CragDto | null;
  slug: string;
  grade: number;
  climbing_kind: ClimbingKind;
  height: number | null;
  equippers: (EquipperDto | string)[];
  eight_anu_route_slugs: string[];
}

@Component({
  selector: 'app-route-form',
  imports: [
    CommonModule,
    CounterComponent,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiDataListWrapper,
    TuiError,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TuiInput,
    TuiInputChip,
    TuiInputNumber,
    TuiLabel,
    TuiSelect,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="areaStringify"
        [identityMatcher]="areaIdentityMatcher"
      >
        <label tuiLabel for="area">
          {{ 'area' | translate }}
        </label>
        <input
          tuiComboBox
          id="area"
          [ngModel]="model().area"
          (ngModelChange)="onAreaChange($event)"
          name="area"
          autocomplete="off"
        />
        <tui-data-list-wrapper
          *tuiDropdown
          new
          [items]="areaOptions.value() || [] | tuiFilterByInput"
        />
      </tui-textfield>

      @if (cragOptions.value()?.length || model().crag) {
        <tui-textfield
          tuiChevron
          [tuiTextfieldCleaner]="false"
          [stringify]="cragStringify"
          [identityMatcher]="cragIdentityMatcher"
        >
          <label tuiLabel for="crag">
            {{ 'crag' | translate }}
          </label>
          <input
            tuiComboBox
            id="crag"
            [ngModel]="model().crag"
            (ngModelChange)="onCragChange($event)"
            name="crag"
            autocomplete="off"
          />
          <tui-data-list-wrapper
            *tuiDropdown
            new
            [items]="cragOptions.value() || [] | tuiFilterByInput"
          />
        </tui-textfield>
      }

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'routes.name' | translate }}</label>
        <input
          tuiInput
          id="name"
          [formField]="routeForm.name"
          autocomplete="off"
        />
      </tui-textfield>

      @if (global.isAdmin()) {
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="slug">{{ 'slug' | translate }}</label>
          <input
            tuiInput
            id="slug"
            [formField]="routeForm.slug"
            type="text"
            autocomplete="off"
          />
        </tui-textfield>
        @if (routeForm.slug().invalid() && routeForm.slug().touched()) {
          <tui-error [error]="'errors.required' | translate" />
        }
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
              | tuiFilterByInput;
            track item.name
          ) {
            <button tuiOption new [value]="item">
              {{ item.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="kindStringify"
      >
        <label tuiLabel for="kind">
          {{ 'climbing_kind' | translate }}
        </label>
        <input
          tuiSelect
          id="kind"
          [ngModel]="model().climbing_kind"
          (ngModelChange)="onKindChange($event)"
          name="climbing_kind"
          autocomplete="off"
        />
        <tui-data-list-wrapper *tuiDropdown new [items]="kindOptions" />
      </tui-textfield>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label tuiLabel for="grade">{{ 'grade' | translate }}</label>
            <input
              tuiSelect
              id="grade"
              [ngModel]="model().grade"
              (ngModelChange)="onGradeChange($event)"
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

        <app-counter
          [ngModel]="model().height"
          (ngModelChange)="onHeightChange($event)"
          name="height"
          label="routes.height"
          suffix="m"
        />
      </div>

      @if (isEdit()) {
        <tui-textfield multi class="block">
          <label tuiLabel for="eight-anu-slugs">
            {{ 'import8a.slugs' | translate }}
          </label>
          <input
            tuiInputChip
            id="eight-anu-slugs"
            [ngModel]="model().eight_anu_route_slugs"
            (ngModelChange)="onRouteSlugsChange($event)"
            name="eight_anu_route_slugs"
            autocomplete="off"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>
      }

      <div class="flex flex-wrap gap-2 justify-end">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="routeForm.name().invalid() || !model().crag"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'save' : 'create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class RouteFormComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly routes = inject(RoutesService);
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly location = inject(Location);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { cragId?: number; routeData?: MinimalRoute }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { cragId?: number; routeData?: MinimalRoute }
        >
      >();
    } catch {
      return null;
    }
  })();

  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  routeData: InputSignal<MinimalRoute | undefined> = input<
    MinimalRoute | undefined
  >(undefined);

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogRouteData = this._dialogCtx?.data?.routeData;

  private readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  private readonly effectiveRouteData: Signal<MinimalRoute | undefined> =
    computed(() => this.dialogRouteData ?? this.routeData());

  readonly isEdit: Signal<boolean> = computed(() => {
    const data = this.effectiveRouteData();
    return !!data?.id && data.id > 0;
  });

  model = signal<RouteFormModel>({
    name: '',
    area: null,
    crag: null,
    slug: '',
    grade: 23,
    climbing_kind: ClimbingKinds.SPORT,
    height: 25,
    equippers: [],
    eight_anu_route_slugs: [],
  });

  routeForm = form<RouteFormModel>(this.model, (path) => {
    required(path.name);
    required(path.area);
    required(path.crag);
    required(path.grade);
    required(path.climbing_kind);
    // Add additional validation if needed
  });

  private editingId: number | null = null;
  private isInitialized = false;
  private isInitialCragApplied = false;

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

  protected readonly areaStringify = (area: AreaDto): string => area.name;

  protected readonly areaIdentityMatcher: TuiIdentityMatcher<AreaDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly cragStringify = (crag: CragDto): string => crag.name;

  protected readonly cragIdentityMatcher: TuiIdentityMatcher<CragDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly areaOptions = resource<AreaDto[], undefined>({
    loader: async () => {
      await this.supabase.whenReady();
      if (!isPlatformBrowser(this.platformId)) return [];
      const { data } = await this.supabase.client
        .from('areas')
        .select('*')
        .order('name');
      return (data as AreaDto[]) || [];
    },
  });

  protected readonly cragOptions = resource<CragDto[], number | null>({
    params: () => this.model().area?.id ?? null,
    loader: async ({ params: areaId }) => {
      await this.supabase.whenReady();
      if (!isPlatformBrowser(this.platformId) || !areaId) return [];

      // 2. Get all crags of that area
      const { data: crags } = await this.supabase.client
        .from('crags')
        .select('id, name')
        .eq('area_id', areaId)
        .order('name');

      return (crags as CragDto[]) || [];
    },
  });

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

  protected readonly allEquippers = resource<EquipperDto[], undefined>({
    loader: async () => {
      await this.supabase.whenReady();
      if (!isPlatformBrowser(this.platformId)) return [];
      const { data } = await this.supabase.client
        .from('equippers')
        .select('*')
        .order('name');
      return (data as EquipperDto[]) || [];
    },
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

  onAreaChange(area: AreaDto | null): void {
    const current = this.model();
    if (current.area?.id !== area?.id) {
      this.model.update((m) => ({ ...m, area, crag: null }));
    }
  }

  constructor() {
    // 1. If we have a target crag ID, ensure we find its area and set it
    effect(async () => {
      const initialCragId = this.effectiveCragId();
      const inputCragId = this.effectiveRouteData()?.crag_id;
      const targetCragId = inputCragId ?? initialCragId;
      const areaOptions = this.areaOptions.value();

      if (!targetCragId || !areaOptions?.length) return;

      const currentArea = untracked(() => this.model().area);
      if (currentArea) return;

      const { data: crag } = await this.supabase.client
        .from('crags')
        .select('area_id')
        .eq('id', targetCragId)
        .maybeSingle();

      if (crag?.area_id) {
        const area = areaOptions.find((a) => a.id === crag.area_id);
        if (area) {
          untracked(() => {
            this.model.update((m) => ({ ...m, area }));
          });
        }
      }
    });

    // 2. Prefill model data and handle late crag selection
    effect(() => {
      const data = this.effectiveRouteData();
      const initialCragId = this.effectiveCragId();
      const targetCragId = data?.crag_id ?? initialCragId;
      const cragOptionsList = this.cragOptions.value();

      // Handle prefill only once
      if (!this.isInitialized) {
        untracked(() => {
          if (data) {
            this.editingId = data.id || null;
            this.model.update((m) => ({
              ...m,
              name: data.name,
              slug: data.slug || '',
              grade: data.grade ?? m.grade,
              climbing_kind: data.climbing_kind ?? m.climbing_kind,
              height: data.height ?? null,
              eight_anu_route_slugs:
                data.eight_anu_route_slugs || m.eight_anu_route_slugs || [],
            }));

            if (data.id) {
              this.fetchFullRouteData(data.id);
              this.routes.getRouteEquippers(data.id).then((equippers) => {
                this.model.update((m) => ({ ...m, equippers }));
              });
            }
            this.isInitialized = true;
          }
        });
      }

      // Handle crag object selection once area is set and cragOptions are loaded
      if (
        targetCragId &&
        cragOptionsList?.length &&
        !this.isInitialCragApplied
      ) {
        const currentCrag = untracked(() => this.model().crag);
        if (!currentCrag || currentCrag.id === targetCragId) {
          const selectedCrag = cragOptionsList.find(
            (c) => c.id === targetCragId,
          );
          if (selectedCrag) {
            untracked(() => {
              this.model.update((m) => ({ ...m, crag: selectedCrag }));
            });
            this.isInitialCragApplied = true;
          }
        }
      }
    });

    // 3. Auto-slug generation
    effect(async () => {
      if (this.isEdit()) return;
      const name = this.model().name;
      const crag = this.model().crag;
      if (!name) return;

      const baseSlug = slugify(name);
      const uniqueSlug = await this.supabase.getUniqueSlug(
        'routes',
        baseSlug,
        crag?.slug || undefined,
      );

      untracked(() => {
        const currentSlug = this.model().slug;
        if (currentSlug !== uniqueSlug) {
          this.model.update((m) => ({ ...m, slug: uniqueSlug }));
        }
      });
    });
  }

  private async fetchFullRouteData(id: number) {
    const { data, error } = await this.routes.getById(id);
    if (data && !error) {
      this.model.update((m) => ({
        ...m,
        eight_anu_route_slugs: data.eight_anu_route_slugs || [],
      }));
      this.routeForm().reset();
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    submit(this.routeForm, async () => {
      const {
        crag,
        name,
        slug,
        grade,
        climbing_kind,
        height,
        equippers,
        eight_anu_route_slugs,
      } = this.model();
      const crag_id = crag?.id;
      if (!crag_id) return;

      try {
        let result: RouteDto | null = null;
        if (this.isEdit() && this.editingId) {
          result = await this.routes.update(this.editingId, {
            crag_id,
            name,
            slug,
            grade,
            climbing_kind,
            height,
            eight_anu_route_slugs,
          });
        } else {
          result = await this.routes.create({
            crag_id,
            name,
            slug,
            grade,
            climbing_kind,
            height,
            eight_anu_route_slugs,
          });
        }

        if (result) {
          await this.routes.setRouteEquippers(result.id, equippers);
          if (this._dialogCtx) {
            this._dialogCtx.completeWith(result.slug || true);
          }
        }
      } catch (e) {
        const error = e as Error;
        console.error('[RouteFormComponent] Error submitting route:', error);
        handleErrorToast(error, this.toast);
      }
    });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  onHeightChange(height: number | null): void {
    this.model.update((m) => ({ ...m, height }));
  }

  onCragChange(crag: CragDto | null): void {
    this.model.update((m) => ({ ...m, crag }));
  }

  onEquippersChange(equippers: (EquipperDto | string)[]): void {
    this.model.update((m) => ({ ...m, equippers }));
  }

  onKindChange(climbing_kind: ClimbingKind): void {
    this.model.update((m) => ({ ...m, climbing_kind }));
  }

  onGradeChange(grade: number): void {
    this.model.update((m) => ({ ...m, grade }));
  }

  onRouteSlugsChange(eight_anu_route_slugs: string[]): void {
    this.model.update((m) => ({ ...m, eight_anu_route_slugs }));
  }
}
