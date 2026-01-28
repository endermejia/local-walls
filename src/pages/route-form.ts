import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
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
  Signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { TuiButton, TuiDataList, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiFilterByInputPipe,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiInputNumber,
  TuiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  ClimbingKind,
  ClimbingKinds,
  EquipperDto,
  RouteDto,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { RoutesService, SupabaseService, ToastService } from '../services';

import { handleErrorToast, slugify } from '../utils';

interface MinimalRoute {
  id: number;
  crag_id: number;
  name: string;
  slug: string;
  grade: number;
  climbing_kind: ClimbingKind;
  height?: number | null;
}

@Component({
  selector: 'app-route-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiInputNumber,
    TuiSelect,
    TuiDataListWrapper,
    TuiChevron,
    TuiInputChip,
    TuiFilterByInputPipe,
    TuiDataList,
    TuiHideSelectedPipe,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'routes.name' | translate }}</label>
        <input tuiTextfield id="name" [formControl]="name" autocomplete="off" />
      </tui-textfield>

      <tui-textfield
        multi
        tuiChevron
        [tuiTextfieldCleaner]="true"
        [stringify]="equipperStringify"
        [identityMatcher]="equipperIdentityMatcher"
      >
        <label tuiLabel for="equippers">
          {{ 'labels.equippers' | translate }}
        </label>
        <input
          tuiInputChip
          id="equippers"
          [formControl]="equippers"
          [placeholder]="'actions.select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiTextfieldDropdown>
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
          {{ 'labels.climbing_kind' | translate }}
        </label>
        <input tuiSelect id="kind" [formControl]="climbing_kind" />
        <tui-data-list-wrapper
          *tuiTextfieldDropdown
          new
          [items]="kindOptions"
        />
      </tui-textfield>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex items-center gap-2">
          <button
            tuiIconButton
            type="button"
            size="m"
            appearance="secondary"
            iconStart="@tui.minus"
            class="!rounded-full shrink-0"
            (click)="changeGrade(-1)"
          >
            -
          </button>
          <tui-textfield
            tuiChevron
            [tuiTextfieldCleaner]="false"
            [stringify]="gradeStringify"
            class="grow"
          >
            <label tuiLabel for="grade">{{ 'labels.grade' | translate }}</label>
            <input tuiSelect id="grade" [formControl]="grade" />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [items]="gradeOptions"
            />
          </tui-textfield>
          <button
            tuiIconButton
            type="button"
            size="m"
            appearance="secondary"
            iconStart="@tui.plus"
            class="!rounded-full shrink-0"
            (click)="changeGrade(1)"
          >
            +
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            tuiIconButton
            type="button"
            size="m"
            appearance="secondary"
            iconStart="@tui.minus"
            class="!rounded-full shrink-0"
            (click)="changeHeight(-1)"
          >
            -
          </button>
          <tui-textfield [tuiTextfieldCleaner]="false" class="grow">
            <label tuiLabel for="height">
              {{ 'routes.height' | translate }}
            </label>
            <input tuiInputNumber id="height" [formControl]="height" />
            <span class="tui-textfield__suffix">m</span>
          </tui-textfield>
          <button
            tuiIconButton
            type="button"
            size="m"
            appearance="secondary"
            iconStart="@tui.plus"
            class="!rounded-full shrink-0"
            (click)="changeHeight(1)"
          >
            +
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-end">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          [disabled]="
            name.invalid ||
            (!name.dirty && !height.dirty && !grade.dirty && !isEdit())
          "
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'actions.save' : 'actions.create') | translate }}
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

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveRouteData(),
  );

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  grade = new FormControl<number>(23, {
    nonNullable: true,
    validators: [Validators.required],
  });
  climbing_kind = new FormControl<ClimbingKind>(ClimbingKinds.SPORT, {
    nonNullable: true,
    validators: [Validators.required],
  });
  height = new FormControl<number | null>(25);
  equippers = new FormControl<readonly (EquipperDto | string)[]>([], {
    nonNullable: true,
  });

  private editingId: number | null = null;

  protected readonly gradeOptions: readonly number[] = Object.keys(
    VERTICAL_LIFE_TO_LABEL,
  ).map(Number);
  protected readonly gradeStringify = (grade: number): string =>
    VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || '';

  protected readonly kindOptions: readonly ClimbingKind[] =
    Object.values(ClimbingKinds);
  protected readonly kindStringify = (kind: ClimbingKind): string =>
    this.translate.instant(`climbingKinds.${kind}`);

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

  protected readonly allEquippers = resource({
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

  protected changeHeight(delta: number): void {
    const current = this.height.value ?? 0;
    const next = Math.max(0, current + delta);
    this.height.setValue(next);
    this.height.markAsDirty();
  }

  protected changeGrade(delta: number): void {
    const current = this.grade.value;
    const currentIndex = this.gradeOptions.indexOf(current);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < this.gradeOptions.length) {
      this.grade.setValue(this.gradeOptions[nextIndex]);
      this.grade.markAsDirty();
    }
  }

  constructor() {
    effect(async () => {
      const data = this.effectiveRouteData();
      if (!data) return;
      this.editingId = data.id;
      this.name.setValue(data.name);
      this.grade.setValue(data.grade);
      this.climbing_kind.setValue(data.climbing_kind);
      this.height.setValue(data.height ?? null);

      // Load equippers
      const equippers = await this.routes.getRouteEquippers(data.id);
      this.equippers.setValue(equippers);
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.name.invalid) return;

    const crag_id = this.effectiveCragId();
    if (!crag_id && !this.isEdit()) return;

    const name = this.name.value;
    const grade = this.grade.value;
    const climbing_kind = this.climbing_kind.value;
    const height = this.height.value;
    const equippers = this.equippers.value;

    try {
      let result: RouteDto | null = null;
      if (this.isEdit() && this.editingId) {
        result = await this.routes.update(this.editingId, {
          name,
          grade,
          climbing_kind,
          height,
        });
      } else if (crag_id) {
        result = await this.routes.create({
          crag_id,
          name,
          slug: slugify(name),
          grade,
          climbing_kind,
          height,
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
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}
