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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { TuiInputNumber } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { TopoRouteWithRoute } from '../models';

import { ToastService, ToposService } from '../services';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-topo-route-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiInputNumber,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <div class="text-lg font-medium text-center">
        {{ topoRouteData()?.route?.name }}
      </div>

      <div class="flex items-center gap-2 justify-center">
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.minus"
          class="!rounded-full shrink-0"
          (click)="changeNumber(-1)"
        >
          -
        </button>
        <tui-textfield [tuiTextfieldCleaner]="false" class="w-24">
          <label tuiLabel for="number">
            {{ 'labels.number' | translate }}
          </label>
          <input tuiInputNumber id="number" [formControl]="number" />
        </tui-textfield>
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.plus"
          class="!rounded-full shrink-0"
          (click)="changeNumber(1)"
        >
          +
        </button>
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
          [disabled]="number.invalid || !number.dirty"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ 'actions.save' | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoRouteFormComponent {
  private readonly topos = inject(ToposService);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  private readonly _dialogCtx: TuiDialogContext<
    boolean | null,
    { topoRouteData?: TopoRouteWithRoute }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<boolean | null, { topoRouteData?: TopoRouteWithRoute }>
      >();
    } catch {
      return null;
    }
  })();

  topoRouteData: InputSignal<TopoRouteWithRoute | undefined> = input<
    TopoRouteWithRoute | undefined
  >(undefined);

  private readonly dialogTopoRouteData = this._dialogCtx?.data?.topoRouteData;

  private readonly effectiveTopoRouteData: Signal<
    TopoRouteWithRoute | undefined
  > = computed(() => this.dialogTopoRouteData ?? this.topoRouteData());

  number = new FormControl<number>(1, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(1)],
  });

  protected changeNumber(delta: number): void {
    const current = this.number.value;
    const next = Math.max(1, current + delta);
    this.number.setValue(next);
    this.number.markAsDirty();
  }

  constructor() {
    effect(() => {
      const data = this.effectiveTopoRouteData();
      if (!data) return;
      this.number.setValue(data.number + 1);
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.number.invalid) return;

    const data = this.effectiveTopoRouteData();
    if (!data) return;

    try {
      await this.topos.updateRouteOrder(
        data.topo_id,
        data.route_id,
        this.number.value - 1,
      );
      if (this._dialogCtx) {
        this._dialogCtx.completeWith(true);
      }
    } catch (e) {
      const error = e as Error;
      console.error('[TopoRouteFormComponent] Error submitting:', error);
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

export default TopoRouteFormComponent;
