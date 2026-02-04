import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TuiIdentityMatcher, tuiIsString, TuiTime } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDataList,
  TuiIcon,
  TuiLabel,
  TuiOptGroup,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiCheckbox,
  TuiChevron,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiInputTime,
  tuiInputTimeOptionsProvider,
  TuiMultiSelect,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import {
  RouteDto,
  TopoDetail,
  TopoDto,
  TopoInsertDto,
  TopoRouteWithRoute,
  TopoUpdateDto,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { GlobalData, ToastService, ToposService } from '../services';

import { AvatarGradeComponent } from '../components/avatar-grade';

import { handleErrorToast, slugify } from '../utils';

@Component({
  selector: 'app-topo-form',
  imports: [
    AvatarGradeComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiCheckbox,
    TuiChevron,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInputChip,
    TuiInputTime,
    TuiLabel,
    TuiMultiSelect,
    TuiOptGroup,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <form
      class="flex flex-col w-full gap-4"
      (submit.zoneless)="onSubmit($event)"
    >
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'topos.name' | translate }}</label>
        <input tuiTextfield id="name" [formControl]="name" autocomplete="off" />
      </tui-textfield>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input tuiCheckbox type="checkbox" [formControl]="shade_morning" />
            <tui-icon icon="@tui.sunset" />
            {{ 'filters.shade.morning' | translate }}
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              tuiCheckbox
              type="checkbox"
              [formControl]="shade_afternoon"
            />
            <tui-icon icon="@tui.sunrise" />
            {{ 'filters.shade.afternoon' | translate }}
          </label>
        </div>

        <tui-textfield [style.opacity]="showShadeChangeHour() ? '1' : '0.5'">
          <label tuiLabel for="shade_change_hour">{{
            'topos.shadeChangeHour' | translate
          }}</label>
          <input
            tuiInputTime
            id="shade_change_hour"
            autocomplete="off"
            [formControl]="shade_change_hour"
          />
        </tui-textfield>
      </div>

      <div class="mt-4">
        <h3 class="text-lg font-semibold mb-2">
          {{ 'topos.manageRoutes' | translate }}
        </h3>
        <tui-textfield
          multi
          tuiChevron
          [stringify]="stringifyRoute"
          [disabledItemHandler]="strings"
          [identityMatcher]="routeIdentityMatcher"
          [tuiTextfieldCleaner]="true"
        >
          <label tuiLabel for="routes-select">{{
            'labels.routes' | translate
          }}</label>
          <input
            tuiInputChip
            id="routes-select"
            autocomplete="off"
            [formControl]="selectedRoutes"
            [placeholder]="'actions.select' | translate"
          />
          <tui-input-chip *tuiItem />
          <tui-data-list *tuiTextfieldDropdown>
            <tui-opt-group label="Vias" tuiMultiSelectGroup>
              @for (
                route of availableRoutes() | tuiFilterByInput;
                track route.id
              ) {
                <button type="button" new tuiOption [value]="route">
                  <div tuiCell size="s">
                    <app-avatar-grade [grade]="route.grade" />
                    <div tuiTitle>
                      {{ route.name }}
                    </div>
                  </div>
                </button>
              }
            </tui-opt-group>
          </tui-data-list>
        </tui-textfield>
      </div>

      <div class="flex flex-wrap gap-2 justify-end mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          [disabled]="name.invalid || shade_change_hour.invalid"
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
  host: { class: 'flex grow min-h-0' },
  providers: [
    tuiInputTimeOptionsProvider({
      valueTransformer: {
        fromControlValue(controlValue: string): TuiTime | null {
          return controlValue ? TuiTime.fromString(controlValue) : null;
        },
        toControlValue(time: TuiTime | null): string {
          return time ? time.toString().slice(0, 5) : '';
        },
      },
    }),
  ],
})
export class TopoFormComponent {
  private readonly topos = inject(ToposService);
  private readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { cragId?: number; topoData?: TopoDetail; initialRouteIds?: number[] }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { cragId?: number; topoData?: TopoDetail; initialRouteIds?: number[] }
        >
      >();
    } catch {
      return null;
    }
  })();

  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  topoData: InputSignal<TopoDetail | undefined> = input<TopoDetail | undefined>(
    undefined,
  );

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogTopoData = this._dialogCtx?.data?.topoData;
  private readonly initialRouteIds =
    this._dialogCtx?.data?.initialRouteIds ?? [];

  private readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  private readonly effectiveTopoData: Signal<TopoDetail | undefined> = computed(
    () => this.dialogTopoData ?? this.topoData(),
  );

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveTopoData());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  photo = new FormControl<string | null>(null);
  shade_morning = new FormControl<boolean>(false, { nonNullable: true });
  shade_afternoon = new FormControl<boolean>(false, { nonNullable: true });
  shade_change_hour = new FormControl<string | null>(null);
  selectedRoutes = new FormControl<readonly RouteDto[]>([], {
    nonNullable: true,
  });

  private readonly shadeMorningSignal = toSignal(
    this.shade_morning.valueChanges.pipe(startWith(this.shade_morning.value)),
    { initialValue: this.shade_morning.value },
  );
  private readonly shadeAfternoonSignal = toSignal(
    this.shade_afternoon.valueChanges.pipe(
      startWith(this.shade_afternoon.value),
    ),
    { initialValue: this.shade_afternoon.value },
  );

  protected readonly showShadeChangeHour = computed(() => {
    const morning = this.shadeMorningSignal();
    const afternoon = this.shadeAfternoonSignal();
    return morning !== afternoon;
  });

  protected readonly availableRoutes = computed(
    () => this.global.cragRoutesResource.value() ?? [],
  );

  protected readonly stringifyRoute = (route: RouteDto): string =>
    `${route.name} (${this.gradeStringify(route.grade)})`;

  protected readonly routeIdentityMatcher: TuiIdentityMatcher<RouteDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected gradeStringify(grade: number): string {
    return (
      VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade?.toString() ||
      ''
    );
  }

  protected readonly strings = tuiIsString;

  constructor() {
    effect(() => {
      const data = this.effectiveTopoData();
      const available = this.availableRoutes();
      if (!data) {
        if (available.length && this.initialRouteIds.length) {
          const selected = available.filter((r) =>
            this.initialRouteIds.includes(r.id),
          );
          this.selectedRoutes.setValue(selected);
        }
        return;
      }
      this.name.setValue(data.name);
      this.photo.setValue(data.photo);
      this.shade_morning.setValue(data.shade_morning);
      this.shade_afternoon.setValue(data.shade_afternoon);
      this.shade_change_hour.setValue(data.shade_change_hour);
      if (available.length && this.initialRouteIds.length) {
        const selected = available.filter((r) =>
          this.initialRouteIds.includes(r.id),
        );
        this.selectedRoutes.setValue(selected);
      }
    });

    // Reset shade_change_hour if both are the same and enable/disable
    effect(() => {
      const show = this.showShadeChangeHour();
      if (!show) {
        this.shade_change_hour.setValue(null);
        this.shade_change_hour.disable();
        this.shade_change_hour.setValidators(null);
      } else {
        this.shade_change_hour.enable();
        this.shade_change_hour.setValidators([Validators.required]);
      }
      this.shade_change_hour.updateValueAndValidity();
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.name.invalid) return;

    const crag_id = this.effectiveCragId();
    if (!crag_id && !this.isEdit()) return;

    if (this.isEdit()) {
      const payload: TopoUpdateDto = {
        name: this.name.value,
        photo: this.photo.value,
        shade_morning: this.shade_morning.value,
        shade_afternoon: this.shade_afternoon.value,
        shade_change_hour: this.shade_change_hour.value,
        crag_id: crag_id!,
      };

      try {
        const topo = await this.topos.update(
          this.effectiveTopoData()!.id,
          payload,
        );
        await this.handleTopoRoutes(topo);
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(topo?.slug || true);
        }
      } catch (e) {
        this.handleSubmitError(e);
      }
    } else {
      const payload: TopoInsertDto = {
        name: this.name.value,
        photo: this.photo.value,
        shade_morning: this.shade_morning.value,
        shade_afternoon: this.shade_afternoon.value,
        shade_change_hour: this.shade_change_hour.value,
        crag_id: crag_id!,
        slug: slugify(this.name.value),
      };

      try {
        const topo = await this.topos.create(payload);
        await this.handleTopoRoutes(topo);
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(topo?.slug || true);
        }
      } catch (e) {
        this.handleSubmitError(e);
      }
    }
  }

  private async handleTopoRoutes(topo: TopoDto | null): Promise<void> {
    if (!topo) return;

    const initial = new Set(this.initialRouteIds);
    const selectedIds = new Set(this.selectedRoutes.value.map((r) => r.id));

    for (const id of initial) {
      if (!selectedIds.has(id)) {
        await this.topos.removeRoute(topo.id, id);
      }
    }

    const existingRoutes = this.effectiveTopoData()?.topo_routes || [];
    const maxNumber =
      existingRoutes.length > 0
        ? Math.max(...existingRoutes.map((tr: TopoRouteWithRoute) => tr.number))
        : -1;
    let nextNumber = maxNumber + 1;

    for (const id of selectedIds) {
      if (!initial.has(id)) {
        await this.topos.addRoute({
          topo_id: topo.id,
          route_id: id,
          number: nextNumber++,
        });
      }
    }
  }

  private handleSubmitError(e: unknown): void {
    const error = e as Error;
    console.error('[TopoFormComponent] Error submitting topo:', error);
    handleErrorToast(error, this.toast);
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}

export default TopoFormComponent;
