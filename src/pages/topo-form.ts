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
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiTime } from '@taiga-ui/cdk';
import {
  TuiCheckbox,
  TuiToastService,
  TuiInputTime,
  tuiInputTimeOptionsProvider,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { ToposService, GlobalData } from '../services';
import { slugify, handleErrorToast } from '../utils';
import {
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  TopoDto,
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
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiCheckbox,
    TuiInputTime,
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
        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input tuiCheckbox type="checkbox" [formControl]="shade_morning" />
            {{ 'filters.shade.morning' | translate }}
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              tuiCheckbox
              type="checkbox"
              [formControl]="shade_afternoon"
            />
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
        <div class="max-h-60 overflow-y-auto border rounded p-2">
          @for (route of availableRoutes(); track route.id) {
            <label
              class="flex items-center gap-2 p-1 hover:bg-black/5 cursor-pointer"
            >
              <input
                tuiCheckbox
                type="checkbox"
                [checked]="isRouteSelected(route.id)"
                (change)="toggleRoute(route.id)"
              />
              <span>{{ route.name }} ({{ gradeStringify(route.grade) }})</span>
            </label>
          }
        </div>
      </div>

      <div class="flex gap-2 justify-end mt-4">
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
  private readonly toast = inject(TuiToastService);
  private readonly translate = inject(TranslateService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { cragId?: number; topoData?: TopoDto; initialRouteIds?: number[] }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { cragId?: number; topoData?: TopoDto; initialRouteIds?: number[] }
        >
      >();
    } catch {
      return null;
    }
  })();

  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  topoData: InputSignal<TopoDto | undefined> = input<TopoDto | undefined>(
    undefined,
  );

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogTopoData = this._dialogCtx?.data?.topoData;
  private readonly initialRouteIds =
    this._dialogCtx?.data?.initialRouteIds ?? [];

  private readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  private readonly effectiveTopoData: Signal<TopoDto | undefined> = computed(
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

  selectedRouteIds = new Set<number>();

  protected readonly availableRoutes = computed(
    () => this.global.cragRoutesResource.value() ?? [],
  );

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
      if (!data) {
        this.initialRouteIds.forEach((id) => this.selectedRouteIds.add(id));
        return;
      }
      this.name.setValue(data.name);
      this.photo.setValue(data.photo);
      this.shade_morning.setValue(data.shade_morning);
      this.shade_afternoon.setValue(data.shade_afternoon);
      this.shade_change_hour.setValue(data.shade_change_hour);
      this.initialRouteIds.forEach((id) => this.selectedRouteIds.add(id));
    });

    // Reset shade_change_hour if both are the same, and enable/disable
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

  isRouteSelected(id: number): boolean {
    return this.selectedRouteIds.has(id);
  }

  toggleRoute(id: number): void {
    if (this.selectedRouteIds.has(id)) {
      this.selectedRouteIds.delete(id);
    } else {
      this.selectedRouteIds.add(id);
    }
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
        // Sync routes
        // This is simplified. Ideally we'd compare with initialRouteIds and add/remove only changes.
        // For simplicity in this first version, we'll assume we might need a more complex sync.
        // But for now, let's just handle it.
        // In a real scenario, we might want a 'topo_routes' bulk update or similar.

        // Remove routes not in selectedRouteIds
        const initial = new Set(this.initialRouteIds);
        for (const id of initial) {
          if (!this.selectedRouteIds.has(id)) {
            await this.topos.removeRoute(topo.id, id);
          }
        }
        // Add routes in selectedRouteIds not in initial
        let number = 0; // Simple number for now
        for (const id of this.selectedRouteIds) {
          if (!initial.has(id)) {
            await this.topos.addRoute({
              topo_id: topo.id,
              route_id: id,
              number: number++,
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

export default TopoFormComponent;
