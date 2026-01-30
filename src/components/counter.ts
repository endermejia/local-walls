import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  model,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiLabel,
    TuiInputNumber,
    TranslatePipe,
  ],
  template: `
    <div class="flex items-center gap-2">
      <button
        tuiIconButton
        type="button"
        size="m"
        appearance="secondary"
        iconStart="@tui.minus"
        class="!rounded-full shrink-0"
        (click)="change(-step())"
        [disabled]="disabled()"
      >
        -
      </button>
      <tui-textfield [tuiTextfieldCleaner]="false" class="grow min-w-0">
        <label tuiLabel [for]="id()">{{ label() | translate }}</label>
        <input
          tuiInputNumber
          [id]="id()"
          [min]="min()"
          [max]="max()"
          [formControl]="control"
          class="!w-full"
        />
        @if (suffix()) {
          <span class="tui-textfield__suffix">{{ suffix() }}</span>
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
        [disabled]="disabled()"
      >
        +
      </button>
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CounterComponent),
      multi: true,
    },
  ],
})
export class CounterComponent implements ControlValueAccessor, OnInit {
  private readonly destroyRef = inject(DestroyRef);

  id = input<string>(`counter-${Math.random().toString(36).slice(2, 9)}`);
  label = input.required<string>();
  suffix = input<string>('');
  min = input<number>(-Infinity);
  max = input<number>(Infinity);
  step = input<number>(1);
  disabled = input<boolean>(false);

  value = model<number>(0);

  protected readonly control = new FormControl<number>(0, {
    nonNullable: true,
  });

  private onChange: (value: number) => void = () => {
    // noop
  };
  private onTouched: () => void = () => {
    // noop
  };

  constructor() {
    effect(() => {
      const isDisabled = this.disabled();
      if (isDisabled) {
        this.control.disable();
      } else {
        this.control.enable();
      }
    });
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
    const currentValue = this.control.value ?? 0;
    const newValue = Math.min(
      this.max(),
      Math.max(this.min(), currentValue + delta),
    );
    this.control.setValue(newValue);
    this.onTouched();
  }

  writeValue(value: number): void {
    this.control.setValue(value || 0, { emitEvent: false });
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.control.disable();
    } else {
      this.control.enable();
    }
  }
}
