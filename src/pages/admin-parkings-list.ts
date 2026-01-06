import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TuiTable,
  TuiSortDirection,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TuiButton, TuiHint, TuiScrollbar, TuiTextfield } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiSkeleton,
  TUI_CONFIRM,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiDialogService } from '@taiga-ui/experimental';

import { GlobalData, ParkingsService, ToastService } from '../services';
import { EmptyStateComponent } from '../components';
import { ParkingDto } from '../models';
import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-admin-parkings-list',
  standalone: true,
  imports: [
    EmptyStateComponent,
    FormsModule,
    TuiAvatar,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    TuiTableSortPipe,
    TuiTextfield,
    TranslatePipe,
    TuiButton,
    TuiHint,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-avatar
            tuiThumbnail
            size="l"
            src="@tui.map-pin"
            class="self-center"
            [attr.aria-label]="'labels.parkings' | translate"
          />
          {{ 'labels.parkings' | translate }}
          ({{ parkings().length }})
        </h1>

        <button
          tuiButton
          size="m"
          appearance="textfield"
          iconStart="@tui.plus"
          (click.zoneless)="addNewParking()"
        >
          {{ 'actions.new' | translate }}
        </button>
      </header>

      <div class="mb-6">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="parking-search">{{
            'labels.search' | translate
          }}</label>
          <input
            id="parking-search"
            tuiTextfield
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'labels.name' | translate"
          />
        </tui-textfield>
      </div>

      <tui-scrollbar class="scrollbar">
        <table
          size="l"
          tuiTable
          class="table"
          [columns]="columns"
          [direction]="direction()"
          [sorter]="sorter()"
          (sortChange)="
            direction.set($event.sortDirection);
            sorter.set($event.sortComparator || defaultSorter)
          "
        >
          <thead tuiThead>
            <tr tuiThGroup>
              <th *tuiHead="'name'" tuiTh [sorter]="nameSorter">
                {{ 'labels.name' | translate }}
              </th>
              <th *tuiHead="'lat'" tuiTh [sorter]="latSorter">
                {{ 'labels.lat' | translate }}
              </th>
              <th *tuiHead="'lng'" tuiTh [sorter]="lngSorter">
                {{ 'labels.lng' | translate }}
              </th>
              <th *tuiHead="'size'" tuiTh [sorter]="sizeSorter">
                {{ 'labels.capacity' | translate }}
              </th>
              <th *tuiHead="'actions'" tuiTh [sorter]="null"></th>
            </tr>
          </thead>

          @let list = filteredParkings() | tuiTableSort;
          <tbody tuiTbody [data]="list">
            @if (loading()) {
              @for (_item of skeletons; track $index) {
                <tr tuiTr>
                  @for (col of columns; track col) {
                    <td *tuiCell="col" tuiTd>
                      <div [tuiSkeleton]="true" class="w-full h-10"></div>
                    </td>
                  }
                </tr>
              }
            } @else {
              @for (item of list; track item.id) {
                <tr tuiTr>
                  <td *tuiCell="'name'" tuiTd>
                    {{ item.name }}
                  </td>
                  <td *tuiCell="'lat'" tuiTd>
                    {{ item.latitude }}
                  </td>
                  <td *tuiCell="'lng'" tuiTd>
                    {{ item.longitude }}
                  </td>
                  <td *tuiCell="'size'" tuiTd>
                    {{ item.size }}
                  </td>
                  <td *tuiCell="'actions'" tuiTd>
                    <div class="flex flex-wrap gap-1">
                      <button
                        tuiIconButton
                        size="s"
                        appearance="neutral"
                        iconStart="@tui.square-pen"
                        class="!rounded-full"
                        [tuiHint]="
                          global.isMobile()
                            ? null
                            : ('actions.edit' | translate)
                        "
                        (click.zoneless)="editParking(item)"
                      >
                        {{ 'actions.edit' | translate }}
                      </button>
                      <button
                        tuiIconButton
                        size="s"
                        appearance="negative"
                        iconStart="@tui.trash"
                        class="!rounded-full"
                        [tuiHint]="
                          global.isMobile()
                            ? null
                            : ('actions.delete' | translate)
                        "
                        (click.zoneless)="deleteParking(item)"
                      >
                        {{ 'actions.delete' | translate }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr tuiTr>
                  <td [attr.colspan]="columns.length" tuiTd>
                    <app-empty-state />
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </tui-scrollbar>
    </section>
  `,
  styles: [
    `
      .scrollbar {
        max-height: calc(100vh - 250px);
      }
      .table {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class AdminParkingsListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly parkingsService = inject(ParkingsService);

  protected readonly columns = [
    'name',
    'lat',
    'lng',
    'size',
    'actions',
  ] as const;

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
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.deleteConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.performDelete(parking.id);
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
