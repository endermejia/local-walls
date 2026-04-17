import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TuiDialogService } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiSkeleton,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import {
  TuiAppearance,
  TuiButton,
  TuiScrollbar,
  TuiInput,
} from '@taiga-ui/core';
import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { ParkingsService } from '../../services/parkings.service';
import { ToastService } from '../../services/toast.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { ParkingDto } from '../../models';

import { handleErrorToast } from '../../utils';

@Component({
  selector: 'app-admin-parkings-list',
  imports: [
    DecimalPipe,
    EmptyStateComponent,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiInput,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    TuiTableSortPipe,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (parkings().length; as parkingsCount) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              >
                {{ parkingsCount }}
              </tui-badge-notification>
            }
            <span
              tuiAvatar="@tui.map-pin"
              tuiThumbnail
              size="l"
              class="self-center"
              [attr.aria-label]="'parkings' | translate"
            ></span>
          </tui-badged-content>
          {{ 'parkings' | translate }}
        </h1>

        <button
          tuiButton
          size="s"
          appearance="textfield"
          iconStart="@tui.plus"
          (click.zoneless)="addNewParking()"
        >
          {{ 'new' | translate }}
        </button>
      </header>

      <div class="mb-6">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="parking-search">{{
            'search' | translate
          }}</label>
          <input
            id="parking-search"
            tuiInput
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'name' | translate"
            autocomplete="off"
          />
        </tui-textfield>
      </div>

      <tui-scrollbar class="flex grow">
        @let list = filteredParkings() | tuiTableSort;
        @if (list.length > 0) {
          <table
            [size]="global.isMobile() ? 's' : 'l'"
            tuiTable
            class="w-full"
            [columns]="columns()"
            [direction]="direction()"
            [sorter]="sorter()"
            (sortChange)="onSortChange($event)"
          >
            <thead tuiThead>
              <tr tuiThGroup>
                <th *tuiHead="'name'" tuiTh [sorter]="nameSorter">
                  {{ 'name' | translate }}
                </th>
                <th *tuiHead="'lat'" tuiTh [sorter]="latSorter" class="w-24!">
                  {{ 'lat' | translate }}
                </th>
                <th *tuiHead="'lng'" tuiTh [sorter]="lngSorter" class="w-24!">
                  {{ 'lng' | translate }}
                </th>
                <th *tuiHead="'size'" tuiTh [sorter]="sizeSorter" class="w-24!">
                  {{ 'capacity' | translate }}
                </th>
                <th
                  *tuiHead="'actions'"
                  tuiTh
                  [sorter]="null"
                  class="w-32! text-right"
                ></th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="list">
              @if (loading()) {
                @for (_item of skeletons; track $index) {
                  <tr tuiTr>
                    @for (col of columns(); track col) {
                      <td *tuiCell="col" tuiTd>
                        <div
                          [tuiSkeleton]="true"
                          class="h-6 w-full rounded-2xl"
                        ></div>
                      </td>
                    }
                  </tr>
                }
              } @else {
                @for (item of list; track item.id) {
                  <tr tuiTr>
                    <td *tuiCell="'name'" tuiTd>
                      <span class="font-medium">{{ item.name }}</span>
                    </td>
                    <td *tuiCell="'lat'" tuiTd>
                      {{ item.latitude | number: '1.4-4' }}
                    </td>
                    <td *tuiCell="'lng'" tuiTd>
                      {{ item.longitude | number: '1.4-4' }}
                    </td>
                    <td *tuiCell="'size'" tuiTd>
                      {{ item.size }}
                    </td>
                    <td *tuiCell="'actions'" tuiTd class="text-right">
                      <div class="flex justify-end gap-2">
                        <button
                          appearance="flat"
                          size="s"
                          tuiIconButton
                          type="button"
                          iconStart="@tui.square-pen"
                          class="rounded-full!"
                          (click.zoneless)="editParking(item)"
                        >
                          {{ 'edit' | translate }}
                        </button>
                        <button
                          appearance="flat-destructive"
                          size="s"
                          tuiIconButton
                          type="button"
                          iconStart="@tui.trash"
                          class="rounded-full!"
                          (click.zoneless)="deleteParking(item)"
                        >
                          {{ 'delete' | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state icon="@tui.car" />
        }
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminParkingsListComponent {
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly parkingsService = inject(ParkingsService);

  protected readonly columns = computed(() => {
    const cols = ['name', 'lat', 'lng', 'size', 'actions'];
    return this.global.isMobile()
      ? cols.filter((c) => c === 'name' || c === 'actions')
      : cols;
  });

  protected readonly loading = this.global.adminParkingsResource.isLoading;
  protected readonly parkings = computed(
    () => this.global.adminParkingsResource.value() ?? [],
  );
  protected readonly searchQuery = signal('');
  protected readonly skeletons = Array(10).fill(0);
  protected readonly defaultSorter: TuiComparator<ParkingDto> = () => 0;

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<ParkingDto>>(
    this.defaultSorter,
  );

  protected readonly nameSorter: TuiComparator<ParkingDto> = (a, b) =>
    tuiDefaultSort(a.name, b.name);
  protected readonly latSorter: TuiComparator<ParkingDto> = (a, b) =>
    tuiDefaultSort(a.latitude, b.latitude);
  protected readonly lngSorter: TuiComparator<ParkingDto> = (a, b) =>
    tuiDefaultSort(a.longitude, b.longitude);
  protected readonly sizeSorter: TuiComparator<ParkingDto> = (a, b) =>
    tuiDefaultSort(a.size, b.size);

  protected readonly filteredParkings = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.parkings();
    return this.parkings().filter((p) => p.name.toLowerCase().includes(query));
  });

  protected onSortChange(sort: TuiTableSortChange<ParkingDto>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.defaultSorter);
  }

  constructor() {
    this.global.resetDataByPage('home');
    if (isPlatformBrowser(this.platformId)) {
      this.global.adminParkingsResource.reload();
    }
  }

  protected addNewParking(): void {
    this.parkingsService.openParkingForm();
  }

  protected editParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({ parkingData: parking });
  }

  protected deleteParking(parking: ParkingDto): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.deleteConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      void this.performDelete(parking.id);
    });
  }

  private async performDelete(id: number): Promise<void> {
    try {
      await this.parkingsService.delete(id);
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
    }
  }
}

export default AdminParkingsListComponent;
