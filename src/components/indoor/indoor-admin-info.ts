import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { TuiButton, TuiInput, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { IndoorCenterDto } from '../../models';

@Component({
  selector: 'app-indoor-admin-info',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TuiButton,
    TuiInput,
    TuiLabel,
    TuiTextarea,
    TuiTextfield,
  ],
  template: `
    <form class="flex flex-col gap-6 max-w-2xl" (ngSubmit)="onSave()">
      <div class="flex flex-col gap-4">
        <tui-textfield tuiTextfieldSize="l">
          <label tuiLabel for="center-name">{{ 'name' | translate }}</label>
          <input
            tuiInput
            id="center-name"
            [(ngModel)]="form().name"
            name="name"
            required
          />
        </tui-textfield>

        <tui-textfield tuiTextfieldSize="l">
          <label tuiLabel for="center-city">{{ 'city' | translate }}</label>
          <input
            tuiInput
            id="center-city"
            [(ngModel)]="form().city"
            name="city"
          />
        </tui-textfield>

        <tui-textfield tuiTextfieldSize="l">
          <label tuiLabel for="center-desc">{{
            'description' | translate
          }}</label>
          <textarea
            tuiTextarea
            id="center-desc"
            [(ngModel)]="form().description"
            name="description"
            class="h-32"
          ></textarea>
        </tui-textfield>
      </div>

      <div class="flex gap-2">
        <button tuiButton type="submit" size="l" appearance="primary">
          {{ 'save' | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminInfoComponent implements OnInit {
  center = input.required<IndoorCenterDto>();

  protected readonly indoor = inject(IndoorService);
  protected readonly loading = signal(false);

  protected readonly form = signal<Partial<IndoorCenterDto>>({});

  ngOnInit() {
    const c = this.center();
    this.form.set({
      name: c.name,
      city: c.city,
      description: c.description,
    });
  }

  async onSave() {
    this.loading.set(true);
    try {
      await this.indoor.updateCenter(this.center().id, this.form());
    } catch (e) {
      console.error('Save error', e);
    } finally {
      this.loading.set(false);
    }
  }
}
