import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiHint,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiSkeleton,
  type TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { EquipperDto } from '../models';

import { GlobalData, SupabaseService, ToastService } from '../services';

import { EmptyStateComponent } from '../components';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-admin-equippers-list',
  imports: [
    EmptyStateComponent,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiButton,
    TuiHint,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    TuiTableSortPipe,
    TuiTextfield,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (equippers().length; as equippersCount) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              >
                {{ equippersCount }}
              </tui-badge-notification>
            }
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.hammer"
              class="self-center"
              [attr.aria-label]="'admin.equippers.title' | translate"
            />
          </tui-badged-content>

          {{ 'admin.equippers.title' | translate }}
        </h1>

        <button
          tuiButton
          size="s"
          appearance="textfield"
          iconStart="@tui.plus"
          (click.zoneless)="addNewEquipper()"
        >
          {{ 'actions.new' | translate }}
        </button>
      </header>

      <div class="mb-6">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="equipper-search">{{
            'labels.search' | translate
          }}</label>
          <input
            id="equipper-search"
            tuiTextfield
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'labels.name' | translate"
          />
        </tui-textfield>
      </div>

      <tui-scrollbar class="flex grow">
        <table
          size="l"
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
                {{ 'labels.name' | translate }}
              </th>
              <th
                *tuiHead="'description'"
                tuiTh
                [sorter]="descriptionSorter"
                class="!w-96"
              >
                {{ 'labels.description' | translate }}
              </th>
              <th
                *tuiHead="'actions'"
                tuiTh
                [sorter]="null"
                class="!w-24 text-right"
              ></th>
            </tr>
          </thead>

          @let list = filteredEquippers() | tuiTableSort;
          <tbody tuiTbody [data]="list">
            @if (loading()) {
              @for (_item of skeletons; track $index) {
                <tr tuiTr>
                  <td *tuiCell="'name'" tuiTd>
                    <div [tuiSkeleton]="true" class="w-full h-10"></div>
                  </td>
                  <td *tuiCell="'description'" tuiTd>
                    <div [tuiSkeleton]="true" class="w-full h-10"></div>
                  </td>
                  <td *tuiCell="'actions'" tuiTd>
                    <div [tuiSkeleton]="true" class="w-10 h-10"></div>
                  </td>
                </tr>
              }
            } @else {
              @for (item of list; track item.id) {
                <tr tuiTr>
                  <td *tuiCell="'name'" tuiTd>
                    <tui-textfield [tuiTextfieldCleaner]="false">
                      <input
                        tuiTextfield
                        [ngModel]="item.name"
                        [ngModelOptions]="options"
                        (ngModelChange)="
                          updateEquipper(item.id, { name: $event })
                        "
                      />
                    </tui-textfield>
                  </td>
                  <td *tuiCell="'description'" tuiTd>
                    <tui-textfield [tuiTextfieldCleaner]="false">
                      <input
                        tuiTextfield
                        [ngModel]="item.description"
                        [ngModelOptions]="options"
                        (ngModelChange)="
                          updateEquipper(item.id, { description: $event })
                        "
                      />
                    </tui-textfield>
                  </td>
                  <td *tuiCell="'actions'" tuiTd>
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
                      (click.zoneless)="deleteEquipper(item)"
                    >
                      {{ 'actions.delete' | translate }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr tuiTr>
                  <td [attr.colspan]="columns().length" tuiTd>
                    <app-empty-state icon="@tui.hammer" />
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminEquippersListComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly options = { updateOn: 'blur' } as const;
  protected readonly columns = computed(() => {
    const cols = ['name', 'description', 'actions'];
    return this.global.isMobile()
      ? cols.filter((c) => c !== 'description')
      : cols;
  });

  protected readonly loading = signal(true);
  protected readonly equippers: WritableSignal<EquipperDto[]> = signal([]);
  protected readonly searchQuery = signal('');
  protected readonly skeletons = Array(10).fill(0);
  protected readonly defaultSorter: TuiComparator<EquipperDto> = () => 0;

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<EquipperDto>>(
    this.defaultSorter,
  );

  protected readonly nameSorter: TuiComparator<EquipperDto> = (a, b) =>
    tuiDefaultSort(a.name, b.name);
  protected readonly descriptionSorter: TuiComparator<EquipperDto> = (a, b) =>
    tuiDefaultSort(a.description || '', b.description || '');

  protected readonly filteredEquippers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.equippers();
    return this.equippers().filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query),
    );
  });

  protected onSortChange(sort: TuiTableSortChange<EquipperDto>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.defaultSorter);
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadEquippers();
    }
    this.global.resetDataByPage('home');
  }

  private async loadEquippers(): Promise<void> {
    try {
      this.loading.set(true);
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('equippers')
        .select('*');

      if (error) throw error;
      this.equippers.set(data || []);
    } catch (e) {
      console.error('[AdminEquippersList] Error loading equippers:', e);
      handleErrorToast(e as Error, this.toast);
    } finally {
      this.loading.set(false);
    }
  }

  protected async addNewEquipper(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('equippers')
        .insert({ name: '' })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        this.equippers.update((list) => [...list, data as EquipperDto]);
      }
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
    }
  }

  protected async updateEquipper(
    id: number,
    patch: Partial<EquipperDto>,
  ): Promise<void> {
    const previousList = this.equippers();
    try {
      // Optimistic update
      this.equippers.update((list) =>
        list.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );

      const { error } = await this.supabase.client
        .from('equippers')
        .update(patch)
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
      // Revert to previous state
      this.equippers.set(previousList);
      // Force a second update with a new reference to ensure Angular detects the change
      // especially for ngModel with updateOn: 'blur'
      setTimeout(() => {
        this.equippers.update((list) =>
          list.map((e) => (e.id === id ? { ...e } : e)),
        );
      }, 0);
    }
  }

  protected deleteEquipper(equipper: EquipperDto): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.equippers.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.equippers.deleteConfirm', {
            name: equipper.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.performDelete(equipper.id);
    });
  }

  private async performDelete(id: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('equippers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.equippers.update((list) => list.filter((e) => e.id !== id));
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
    }
  }
}

export default AdminEquippersListComponent;
