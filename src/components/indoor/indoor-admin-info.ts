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
import { Router } from '@angular/router';

import {
  TuiButton,
  TuiInput,
  TuiLabel,
  TuiTextfield,
  TuiCheckbox,
} from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { IndoorCenterDto, IndoorSchedule } from '../../models';

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
    TuiCheckbox,
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

      <!-- Schedule Section -->
      <div
        class="flex flex-col gap-4 border-t border-(--tui-border-normal) pt-6"
      >
        <h3 class="font-bold text-lg">{{ 'indoor.schedule' | translate }}</h3>

        <div class="flex flex-col gap-4">
          @for (day of weekDays; track day) {
            @let d = scheduleForm()[day];
            @if (d) {
              <div
                class="flex flex-wrap items-center gap-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-(--tui-border-normal)"
              >
                <span class="font-bold w-24 capitalize">{{
                  day | translate
                }}</span>

                <label class="flex items-center gap-2">
                  <input
                    tuiCheckbox
                    type="checkbox"
                    [ngModel]="d.closed"
                    (ngModelChange)="onClosedChange(day, $event)"
                    [ngModelOptions]="{ standalone: true }"
                  />
                  <span>{{ 'indoor.closed' | translate }}</span>
                </label>

                @if (!d.closed) {
                  <div class="flex items-center gap-2">
                    <tui-textfield tuiTextfieldSize="s" class="w-24">
                      <input
                        tuiInput
                        type="time"
                        [ngModel]="d.open"
                        (ngModelChange)="onTimeChange(day, 'open', $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    </tui-textfield>
                    <span>-</span>
                    <tui-textfield tuiTextfieldSize="s" class="w-24">
                      <input
                        tuiInput
                        type="time"
                        [ngModel]="d.close"
                        (ngModelChange)="onTimeChange(day, 'close', $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    </tui-textfield>
                  </div>

                  <label class="flex items-center gap-2 ml-4">
                    <input
                      tuiCheckbox
                      type="checkbox"
                      [ngModel]="d.hasSplit"
                      (ngModelChange)="onSplitChange(day, $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                    <span>Jornada partida</span>
                  </label>

                  @if (d.hasSplit) {
                    <div class="flex items-center gap-2">
                      <tui-textfield tuiTextfieldSize="s" class="w-24">
                        <input
                          tuiInput
                          type="time"
                          [ngModel]="d.open2"
                          (ngModelChange)="onTimeChange(day, 'open2', $event)"
                          [ngModelOptions]="{ standalone: true }"
                        />
                      </tui-textfield>
                      <span>-</span>
                      <tui-textfield tuiTextfieldSize="s" class="w-24">
                        <input
                          tuiInput
                          type="time"
                          [ngModel]="d.close2"
                          (ngModelChange)="onTimeChange(day, 'close2', $event)"
                          [ngModelOptions]="{ standalone: true }"
                        />
                      </tui-textfield>
                    </div>
                  }
                }
              </div>
            }
          }
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          tuiButton
          type="button"
          size="l"
          appearance="secondary"
          (click.zoneless)="onCancel()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          type="submit"
          size="l"
          appearance="primary"
          [disabled]="loading()"
        >
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
  private readonly router = inject(Router);
  protected readonly loading = signal(false);

  protected readonly form = signal<Partial<IndoorCenterDto>>({});

  protected readonly weekDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  protected readonly scheduleForm = signal<
    Record<
      string,
      {
        closed: boolean;
        open: string;
        close: string;
        hasSplit: boolean;
        open2: string;
        close2: string;
      }
    >
  >({});

  ngOnInit() {
    const c = this.center();
    this.form.set({
      name: c.name,
      city: c.city,
      description: c.description,
    });

    const schedule = (c.schedule as unknown as IndoorSchedule) || {
      normal: {},
    };
    const defaultSchedule = this.weekDays.reduce(
      (acc, day) => {
        const s = schedule.normal?.[day] || {
          closed: true,
          open: '09:00',
          close: '21:00',
        };
        acc[day] = {
          closed: !!s.closed,
          open: s.open || '09:00',
          close: s.close || '21:00',
          hasSplit: !!(s.open2 && s.close2),
          open2: s.open2 || '16:00',
          close2: s.close2 || '21:00',
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    this.scheduleForm.set(defaultSchedule);
  }

  protected onClosedChange(day: string, closed: boolean): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        closed,
      },
    }));
  }

  protected onSplitChange(day: string, hasSplit: boolean): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        hasSplit,
      },
    }));
  }

  protected onTimeChange(
    day: string,
    key: 'open' | 'close' | 'open2' | 'close2',
    val: string,
  ): void {
    this.scheduleForm.update((sf) => ({
      ...sf,
      [day]: {
        ...sf[day],
        [key]: val,
      },
    }));
  }

  async onSave() {
    this.loading.set(true);
    try {
      const normalSchedule: Record<string, any> = {};
      const sf = this.scheduleForm();
      for (const day of this.weekDays) {
        const d = sf[day];
        normalSchedule[day] = {
          closed: d.closed,
          open: d.closed ? null : d.open,
          close: d.closed ? null : d.close,
          open2: !d.closed && d.hasSplit ? d.open2 : null,
          close2: !d.closed && d.hasSplit ? d.close2 : null,
        };
      }
      const payload = {
        ...this.form(),
        schedule: { normal: normalSchedule },
      };
      await this.indoor.updateCenter(this.center().id, payload);
      void this.router.navigate(['/indoor', this.center().slug]);
    } catch (e) {
      console.error('[IndoorAdminInfoComponent] Error saving center info:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected onCancel(): void {
    void this.router.navigate(['/indoor', this.center().slug]);
  }
}
