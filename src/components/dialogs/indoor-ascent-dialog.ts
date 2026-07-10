import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext, TuiLabel, TuiButton } from '@taiga-ui/core';
import { TuiChevron, TuiSelect, TuiInputDate } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiDay } from '@taiga-ui/cdk';

export interface IndoorAscentDialogData {
  routeId: string;
  routeName: string;
  ascentData?: {
    id: string;
    type: string;
    date: string;
    notes: string;
  };
}

export interface IndoorAscentDialogResult {
  type: string;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-indoor-ascent-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiLabel,
    TuiSelect,
    TuiChevron,
    TuiInputDate,
  ],
  template: `
    <form
      (submit.zoneless)="onSubmit($event)"
      class="flex flex-col gap-4 min-w-[280px]"
    >
      <h3 class="text-lg font-bold mb-2">
        {{ (data.ascentData ? 'ascent.editTitle' : 'ascent.new') | translate }}
        - {{ data.routeName }}
      </h3>

      <tui-textfield
        tuiChevron
        [tuiTextfieldCleaner]="false"
        [stringify]="stringifyType"
      >
        <label tuiLabel for="type">{{ 'type' | translate }}</label>
        <select tuiSelect id="type" [(ngModel)]="type" name="type">
          @for (option of typeOptions; track option) {
            <option [value]="option">
              {{ 'ascentTypes.' + option | translate }}
            </option>
          }
        </select>
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="date">{{ 'date' | translate }}</label>
        <input tuiInputDate id="date" [(ngModel)]="date" name="date" />
      </tui-textfield>

      <tui-textfield [tuiTextfieldCleaner]="true">
        <label tuiLabel for="notes">{{ 'notes' | translate }}</label>
        <input
          tuiInput
          id="notes"
          [(ngModel)]="notes"
          name="notes"
          autocomplete="off"
        />
      </tui-textfield>

      <footer class="flex justify-end gap-2 mt-4">
        <button
          appearance="secondary"
          tuiButton
          type="button"
          (click.zoneless)="onCancel()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button tuiButton type="submit">
          {{ 'save' | translate }}
        </button>
      </footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAscentDialogComponent {
  protected readonly context =
    inject<
      TuiDialogContext<IndoorAscentDialogResult | null, IndoorAscentDialogData>
    >(POLYMORPHEUS_CONTEXT);
  protected readonly data = this.context.data;

  protected type = 'rp';
  protected date = TuiDay.currentLocal();
  protected notes = '';

  protected readonly typeOptions = ['os', 'f', 'rp', 'attempt'];
  protected readonly stringifyType = (t: string) => t;

  constructor() {
    if (this.data.ascentData) {
      this.type = this.data.ascentData.type;
      if (this.data.ascentData.date) {
        const d = new Date(this.data.ascentData.date);
        this.date = new TuiDay(d.getFullYear(), d.getMonth(), d.getDate());
      }
      this.notes = this.data.ascentData.notes || '';
    }
  }

  protected onCancel(): void {
    this.context.completeWith(null);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const nativeDate = this.date.toLocalNativeDate();
    this.context.completeWith({
      type: this.type,
      date: nativeDate.toISOString(),
      notes: this.notes.trim(),
    });
  }
}
