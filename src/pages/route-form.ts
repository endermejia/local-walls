import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  Signal,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiChevron,
  TuiInputNumber,
  TuiSelect,
  TuiDataListWrapper,
  TuiToastService,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { RoutesService } from '../services';
import { slugify, handleErrorToast } from '../utils';
import {
  ClimbingKinds,
  ClimbingKind,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

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
  standalone: true,
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
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'routes.name' | translate }}</label>
        <input tuiTextfield id="name" [formControl]="name" autocomplete="off" />
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

      <div class="flex gap-2 justify-end">
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
  host: { class: 'overflow-auto' },
})
export class RouteFormComponent {
  private readonly routes = inject(RoutesService);
  private readonly location = inject(Location);
  private readonly toast = inject(TuiToastService);
  private readonly translate = inject(TranslateService);
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
    effect(() => {
      const data = this.effectiveRouteData();
      if (!data) return;
      this.editingId = data.id;
      this.name.setValue(data.name);
      this.grade.setValue(data.grade);
      this.climbing_kind.setValue(data.climbing_kind);
      this.height.setValue(data.height ?? null);
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.name.invalid) return;

    const crag_id = this.effectiveCragId();
    if (!crag_id && !this.isEdit()) return;

    const name = this.name.value;
    const slug = slugify(name);
    const grade = this.grade.value;
    const climbing_kind = this.climbing_kind.value;
    const height = this.height.value;

    try {
      if (this.isEdit() && this.editingId) {
        const result = await this.routes.update(this.editingId, {
          name,
          slug,
          grade,
          climbing_kind,
          height,
        });
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(result?.slug || true);
        }
      } else if (crag_id) {
        const result = await this.routes.create({
          crag_id,
          name,
          slug,
          grade,
          climbing_kind,
          height,
        });
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(result?.slug || true);
        }
      }
    } catch (e) {
      const error = e as Error;
      console.error('[RouteFormComponent] Error submitting route:', error);
      handleErrorToast(error, this.toast, this.translate);
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

export default RouteFormComponent;
