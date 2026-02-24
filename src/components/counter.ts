import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
} from '@angular/forms';

import { TuiButton, TuiError, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiLabel,
    TuiError,
    TuiInputNumber,
    TranslatePipe,
  ],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.minus"
          class="!rounded-full shrink-0"
          (click)="change(-step())"
          [disabled]="disabled() || isControlDisabled"
        >
          -
        </button>
        <tui-textfield
          [tuiTextfieldCleaner]="false"
          class="grow min-w-0"
          [class.tui-textfield_invalid]="invalid"
        >
          <label tuiLabel [for]="id()">{{ label() | translate }}</label>
          <input
            tuiInputNumber
            [id]="id()"
            [min]="min()"
            [max]="max()"
            [formControl]="control"
            [invalid]="!!invalid"
            class="!w-full"
          />
          @if (suffix()) {
            <span class="tui-textfield__suffix">{{ suffix() }}</span>
          }
          @if (invalid && hasError('required')) {
            <tui-error [error]="requiredLabel() | translate" />
          }
        </tui-textfield>
        <button
          tuiIconButton
          type="button"
          size="m"
          appearance="secondary"
          iconStart="@tui.plus"
          class="!rounded-full shrink-0"
          (click)="change(step())"
          [disabled]="disabled() || isControlDisabled"
        >
          +
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent implements ControlValueAccessor, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  public readonly ngControl = inject(NgControl, { optional: true, self: true });

  id = input<string>(`counter-${Math.random().toString(36).slice(2, 9)}`);
  label = input.required<string>();
  suffix = input<string>('');
  min = input<number>(-Infinity);
  max = input<number>(Infinity);
  step = input<number>(1);
  disabled = input<boolean>(false);
  requiredLabel = input<string>('errors.required');

  value = model<number | null>(null);

  protected readonly control = new FormControl<number | null>(null);
  protected isControlDisabled = false;

  private onChange: (value: number | null) => void = () => {
    // no-op
  };
  private onTouched: () => void = () => {
    // no-op
  };

  private readonly status = this.ngControl?.statusChanges
    ? toSignal(
        this.ngControl.statusChanges.pipe(
          startWith(this.ngControl.control?.status),
        ),
      )
    : null;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      // Sync errors when status changes
      this.status?.();

      const parent = this.ngControl?.control;
      if (parent) {
        if (parent.errors) {
          this.control.setErrors(parent.errors);
        } else {
          this.control.setErrors(null);
        }

        if (parent.touched) {
          this.control.markAsTouched();
        } else {
          this.control.markAsUntouched();
        }
      }
    });

    effect(() => {
      const isDisabled = this.disabled();
      if (isDisabled) {
        this.control.disable();
      } else if (!this.isControlDisabled) {
        this.control.enable();
      }
    });
  }

  get invalid(): boolean | null {
    return this.ngControl
      ? this.ngControl.invalid &&
          (this.ngControl.touched || this.ngControl.dirty)
      : false;
  }

  hasError(error: string): boolean {
    return !!this.ngControl?.control?.hasError(error);
  }

  ngOnInit(): void {
    this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.value.set(value);
        this.onChange(value);
      });
  }

  change(delta: number): void {
    if (this.disabled() || this.isControlDisabled) return;

    const currentValue = this.control.value;
    const newValue = Math.min(
      this.max(),
      Math.max(this.min(), (currentValue || 0) + delta),
    );
    this.control.setValue(newValue);
    this.onTouched();
    this.control.markAsTouched();
  }

  writeValue(value: number | null): void {
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isControlDisabled = isDisabled;
    if (isDisabled) {
      this.control.disable();
    } else if (!this.disabled()) {
      this.control.enable();
    }
  }
}
