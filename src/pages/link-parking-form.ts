import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiLabel,
  TuiTextfield,
  TuiSelectLike,
} from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  TuiChevron,
  TuiFilterByInputPipe,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiDataListWrapper,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { ParkingsService, SupabaseService } from '../services';
import { ParkingDto } from '../models';

@Component({
  selector: 'app-link-parking-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TranslatePipe,
    TuiChevron,
    TuiInputChip,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TuiDataListWrapper,
    TuiSelectLike,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield
        multi
        tuiChevron
        [tuiTextfieldCleaner]="true"
        [stringify]="parkingStringify"
        [identityMatcher]="parkingIdentityMatcher"
      >
        <label tuiLabel for="parkings">
          {{ 'labels.parkings' | translate }}
        </label>
        <input
          tuiInputChip
          tuiSelectLike
          id="parkings"
          [formControl]="selectedParkings"
          [placeholder]="'actions.select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list-wrapper
          *tuiTextfieldDropdown
          [items]="availableParkings() | tuiHideSelected | tuiFilterByInput"
          [itemContent]="parkingItem"
        />
        <ng-template #parkingItem let-item>
          {{ item.name }}
        </ng-template>
      </tui-textfield>

      <div class="flex gap-2 justify-end mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="close()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          [disabled]="selectedParkings.value.length === 0"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ 'actions.apply' | translate }}
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

  protected readonly selectedParkings = new FormControl<readonly ParkingDto[]>(
    [],
    {
      nonNullable: true,
      validators: [Validators.required],
    },
  );

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

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const cragId = this.context.data.cragId;
    const selected = this.selectedParkings.value;

    try {
      for (const p of selected) {
        await this.parkingsService.addParkingToCrag(cragId, p.id);
      }
      this.context.completeWith(true);
    } catch (e) {
      console.error('[LinkParkingFormComponent] Error linking parkings:', e);
    }
  }

  close(): void {
    this.context.completeWith(false);
  }
}

export default LinkParkingFormComponent;
