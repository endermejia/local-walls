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
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiIdentityMatcher, TuiTime } from '@taiga-ui/cdk';
import {
  TuiCheckbox,
  TuiInputTime,
  tuiInputTimeOptionsProvider,
  TuiDataListWrapper,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiMultiSelect,
  TuiChevron,
  TuiHideSelectedPipe,
} from '@taiga-ui/kit';
import { TuiSelectLike } from '@taiga-ui/core';
import { TuiCell } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { ToposService, GlobalData, ToastService } from '../services';
import { slugify, handleErrorToast } from '../utils';
import { AvatarGradeComponent } from '../components';
import {
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  TopoDto,
  RouteDto,
  TopoDetail,
  TopoRouteWithRoute,
} from '../models';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-topo-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiChevron,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiCheckbox,
    TuiInputTime,
    TuiDataListWrapper,
    TuiFilterByInputPipe,
    TuiInputChip,
    TuiMultiSelect,
    TuiSelectLike,
    TuiCell,
    AvatarGradeComponent,
    TuiTitle,
    TuiIcon,
    TuiHideSelectedPipe,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'topos.name' | translate }}</label>
        <input tuiTextfield id="name" [formControl]="name" autocomplete="off" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="photo">{{ 'topos.photoUrl' | translate }}</label>
        <input
          tuiTextfield
          id="photo"
          [formControl]="photo"
          autocomplete="off"
        />
      </tui-textfield>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          [identityMatcher]="routeIdentityMatcher"
          [tuiTextfieldCleaner]="true"
        >
          <label tuiLabel for="routes-select">{{
            'labels.routes' | translate
          }}</label>
          <input
            tuiInputChip
            tuiSelectLike
            id="routes-select"
            [formControl]="selectedRoutes"
            [placeholder]="'actions.select' | translate"
          />
          <tui-input-chip *tuiItem />
          <tui-data-list-wrapper
            *tuiTextfieldDropdown
            new
            tuiMultiSelectGroup
            [items]="availableRoutes() | tuiHideSelected | tuiFilterByInput"
            [itemContent]="routeItem"
          />
          <ng-template #routeItem let-item>
            <div tuiCell size="s">
              <app-avatar-grade [grade]="item.grade" size="s" />
              <div tuiTitle>
                {{ item.name }}
              </div>
            </div>
          </ng-template>
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
  host: { class: 'overflow-auto' },
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

    const payload = {
      name: this.name.value,
      slug: slugify(this.name.value),
      photo: this.photo.value,
      shade_morning: this.shade_morning.value,
      shade_afternoon: this.shade_afternoon.value,
      shade_change_hour: this.shade_change_hour.value,
      crag_id: crag_id!,
    };

    try {
      let topo: TopoDto | null = null;
      if (this.isEdit() && this.effectiveTopoData()) {
        topo = await this.topos.update(this.effectiveTopoData()!.id, payload);
      } else {
        topo = await this.topos.create(payload);
      }

      if (topo) {
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
            ? Math.max(
                ...existingRoutes.map((tr: TopoRouteWithRoute) => tr.number),
              )
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

      if (this._dialogCtx) {
        this._dialogCtx.completeWith(topo?.slug || true);
      }
    } catch (e) {
      const error = e as Error;
      console.error('[TopoFormComponent] Error submitting topo:', error);
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

export default TopoFormComponent;
