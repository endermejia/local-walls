import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { form, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';

import { TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
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
  TuiChevron,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiMultiSelect,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { ParkingsService } from '../services/parkings.service';
import { SupabaseService } from '../services/supabase.service';

import { ParkingDto } from '../models';

@Component({
  selector: 'app-link-parking-form',
  imports: [
    CommonModule,
    FormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiChevron,
    TuiInputChip,
    TuiFilterByInputPipe,
    TuiDataList,
    TuiOptGroup,
    TuiMultiSelect,
    TuiCell,
    TuiIcon,
    TuiTitle,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield
        multi
        tuiChevron
        [tuiTextfieldCleaner]="true"
        [stringify]="parkingStringify"
        [disabledItemHandler]="strings"
        [identityMatcher]="parkingIdentityMatcher"
      >
        <label tuiLabel for="parkings">
          {{ 'parkings' | translate }}
        </label>
        <input
          tuiInputChip
          id="parkings"
          [ngModel]="model().selectedParkings"
          (ngModelChange)="onParkingsChange($event)"
          name="selectedParkings"
          [placeholder]="'select' | translate"
          autocomplete="off"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiTextfieldDropdown>
          <tui-opt-group label="Parkings" tuiMultiSelectGroup>
            @for (
              parking of availableParkings() | tuiFilterByInput;
              track parking.id
            ) {
              <button type="button" new tuiOption [value]="parking">
                <div tuiCell size="s">
                  <tui-icon icon="@tui.parking-square" />
                  <div tuiTitle>
                    {{ parking.name }}
                  </div>
                </div>
              </button>
            }
          </tui-opt-group>
        </tui-data-list>
      </tui-textfield>

      <div class="flex flex-wrap gap-2 justify-end mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="close()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="model().selectedParkings.length === 0"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ 'apply' | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkParkingFormComponent {
  private readonly parkingsService = inject(ParkingsService);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly context =
    injectContext<
      TuiDialogContext<
        boolean,
        { cragId: number; existingParkingIds: number[] }
      >
    >();

  protected readonly model = signal({
    selectedParkings: [] as ParkingDto[],
  });

  protected readonly linkForm = form(this.model, (path) => {
    required(path.selectedParkings);
  });

  protected readonly allParkings = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      await this.supabase.whenReady();
      return this.parkingsService.getAll();
    },
  });

  protected readonly availableParkings = computed(() => {
    const all = this.allParkings.value() || [];
    const existingIds = this.context.data.existingParkingIds;
    return all.filter((p) => !existingIds.includes(p.id));
  });

  protected readonly parkingStringify = (item: ParkingDto): string => item.name;

  protected readonly parkingIdentityMatcher: TuiIdentityMatcher<ParkingDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly strings = tuiIsString;

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    submit(this.linkForm, async () => {
      const cragId = this.context.data.cragId;
      const selected = this.model().selectedParkings;

      try {
        for (const p of selected) {
          await this.parkingsService.addParkingToCrag(cragId, p.id);
        }
        this.context.completeWith(true);
      } catch (e) {
        console.error('[LinkParkingFormComponent] Error linking parkings:', e);
      }
    });
  }

  close(): void {
    this.context.completeWith(false);
  }

  onParkingsChange(parkings: ParkingDto[]): void {
    this.model.update((m) => ({ ...m, selectedParkings: parkings }));
  }
}

export default LinkParkingFormComponent;
