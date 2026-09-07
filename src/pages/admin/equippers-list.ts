import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  TemplateRef,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  type TuiDialogContext,
  TuiDialogService,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLink,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiComboBox,
  TuiDataListWrapper,
  TuiSkeleton,
  type TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { LayoutService } from '../../services/layout.service'; // Only for non-delegated properties
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { EquipperDto } from '../../models';

import { handleErrorToast, matchesQuery } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-equippers-list',
  standalone: true,
  imports: [
    EmptyStateComponent,
    FormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiComboBox,
    TuiDataListWrapper,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    TuiTextfield,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (equippers().length; as equippersCount) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ equippersCount }}
                  </tui-badge-notification>
                </ng-container>
              }
              <div
                class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.hammer" />
              </div>
            </tui-badged-content>

            {{ 'admin.equippers.title' | translate }}
          </a>
        </h1>

        <button
          tuiButton
          size="s"
          appearance="textfield"
          iconStart="@tui.plus"
          (click.zoneless)="addNewEquipper()"
        >
          {{ 'new' | translate }}
        </button>
      </header>

      <div class="mb-6">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="equipper-search">{{
            'search' | translate
          }}</label>
          <input
            id="equipper-search"
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
        @if (filteredEquippers().length > 0) {
          <table
            [size]="layout.isMobile() ? 's' : 'l'"
            tuiTable
            class="w-full"
            [columns]="columns"
            [direction]="direction()"
            [sorter]="sorter()"
            (sortChange)="onSortChange($event)"
          >
            @let list = filteredEquippers() | tuiTableSort;
            <thead tuiThead>
              <tr tuiThGroup>
                <th
                  *tuiHead="'name'"
                  tuiTh
                  [sorter]="nameSorter"
                  class="min-w-[200px]"
                >
                  {{ 'name' | translate }}
                </th>
                <th
                  *tuiHead="'user_id'"
                  tuiTh
                  [sorter]="null"
                  class="min-w-[220px]"
                >
                  {{ 'user' | translate }}
                </th>
                <th
                  *tuiHead="'description'"
                  tuiTh
                  [sorter]="descriptionSorter"
                  class="min-w-[220px]"
                >
                  {{ 'description' | translate }}
                </th>
                <th
                  *tuiHead="'actions'"
                  tuiTh
                  [sorter]="null"
                  class="w-20! min-w-[80px] text-right"
                ></th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="list">
              @if (loading()) {
                @for (_item of skeletons; track $index) {
                  <tr tuiTr>
                    <td *tuiCell="'name'" tuiTd>
                      <div [tuiSkeleton]="true" class="w-full h-10"></div>
                    </td>
                    <td *tuiCell="'user_id'" tuiTd>
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
                      <div class="flex items-center gap-2">
                        @if (item.id) {
                          <a
                            tuiLink
                            [routerLink]="['/equipper', item.id]"
                            class="font-medium shrink-0"
                            [title]="'view' | translate"
                          >
                            <tui-icon icon="@tui.external-link" size="s" />
                          </a>
                        }
                        <tui-textfield
                          class="grow"
                          [tuiTextfieldCleaner]="false"
                        >
                          <input
                            tuiInput
                            [ngModel]="item.name"
                            [ngModelOptions]="options"
                            (ngModelChange)="
                              updateEquipper(item.id, { name: $event })
                            "
                            autocomplete="off"
                          />
                        </tui-textfield>
                      </div>
                    </td>
                    <td *tuiCell="'user_id'" tuiTd>
                      <tui-textfield
                        [tuiTextfieldCleaner]="true"
                        [stringify]="userStringify"
                        [identityMatcher]="userIdMatcher"
                      >
                        <input
                          tuiComboBox
                          [placeholder]="'searchUser' | translate"
                          [ngModel]="item.user_id"
                          (ngModelChange)="
                            updateEquipper(item.id, { user_id: $event })
                          "
                          autocomplete="off"
                        />
                        <tui-data-list-wrapper
                          *tuiDropdown
                          [items]="
                            usersResource.value() || [] | tuiFilterByInput
                          "
                        />
                      </tui-textfield>
                    </td>
                    <td *tuiCell="'description'" tuiTd>
                      <tui-textfield [tuiTextfieldCleaner]="false">
                        <input
                          tuiInput
                          [ngModel]="item.description"
                          [ngModelOptions]="options"
                          (ngModelChange)="
                            updateEquipper(item.id, { description: $event })
                          "
                          autocomplete="off"
                        />
                      </tui-textfield>
                    </td>
                    <td *tuiCell="'actions'" tuiTd>
                      <button
                        tuiIconButton
                        size="s"
                        appearance="negative"
                        iconStart="@tui.trash"
                        class="rounded-full!"
                        (click.zoneless)="deleteEquipper(item)"
                      >
                        {{ 'delete' | translate }}
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state icon="@tui.hammer" />
        }
      </tui-scrollbar>
    </section>

    <!-- Modal dialog for adding a new equipper -->
    <ng-template #addEquipperDialog let-observer>
      <form
        class="flex flex-col gap-4 p-4"
        (submit.zoneless)="
          $event.preventDefault();
          observer.next(equipperName());
          observer.complete()
        "
      >
        <tui-textfield>
          <label tuiLabel for="new-equipper-name">{{
            'name' | translate
          }}</label>
          <input
            id="new-equipper-name"
            name="equipperName"
            tuiInput
            type="text"
            [ngModel]="equipperName()"
            (ngModelChange)="equipperName.set($event)"
            [placeholder]="'name' | translate"
            autocomplete="off"
            required
          />
        </tui-textfield>

        <div class="flex justify-end gap-2 mt-2">
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="m"
            (click.zoneless)="observer.complete()"
          >
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            type="submit"
            appearance="primary"
            size="m"
            [disabled]="!equipperName().trim()"
          >
            {{ 'create' | translate }}
          </button>
        </div>
      </form>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminEquippersListComponent {
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly layout = inject(LayoutService); // Only for non-delegated properties
  protected readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  @ViewChild('addEquipperDialog')
  private readonly addEquipperDialog?: TemplateRef<TuiDialogContext<string>>;

  protected readonly equipperName = signal('');

  protected readonly options = { updateOn: 'blur' } as const;

  protected readonly usersResource = resource({
    loader: async () => {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select('id, name')
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  protected readonly userStringify = (
    user: { id: string; name: string | null } | string | null,
  ): string => {
    if (!user) return '';
    if (typeof user === 'string') {
      const found = this.usersResource.value()?.find((u) => u.id === user);
      return found?.name || user;
    }
    return user.name || user.id;
  };

  protected readonly userIdMatcher = (
    a: { id: string } | string | null,
    b: { id: string } | string | null,
  ) => {
    const idA = typeof a === 'string' ? a : a?.id;
    const idB = typeof b === 'string' ? b : b?.id;
    return idA === idB;
  };

  protected readonly columns = ['name', 'user_id', 'description', 'actions'];

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
    const query = this.searchQuery();
    return this.equippers().filter(
      (e) => matchesQuery(e.name, query) || matchesQuery(e.description, query),
    );
  });

  protected onSortChange(sort: TuiTableSortChange<EquipperDto>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.defaultSorter);
  }

  constructor() {
    this.outdoorData.clearSelection();
    if (this.isBrowser) {
      void this.loadEquippers();
    }
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
      handleErrorToast(e, this.toast);
    } finally {
      this.loading.set(false);
    }
  }

  protected async addNewEquipper(): Promise<void> {
    if (!this.addEquipperDialog) return;
    this.equipperName.set('');

    try {
      const name = await firstValueFrom(
        this.dialogs.open<string>(this.addEquipperDialog, {
          size: 's',
          label: this.translate.instant('admin.equippers.newEquipperTitle'),
        }),
        { defaultValue: undefined },
      );

      if (!name || !name.trim()) return;

      const { data, error } = await this.supabase.client
        .from('equippers')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        this.equippers.update((list) => [...list, data as EquipperDto]);
      }
    } catch (e) {
      handleErrorToast(e, this.toast);
    }
  }

  protected async updateEquipper(
    id: number,
    patch: Partial<EquipperDto>,
  ): Promise<void> {
    const previousList = this.equippers();

    if (patch.name !== undefined && !patch.name.trim()) {
      this.toast.error(this.translate.instant('admin.equippers.nameRequired'));
      this.equippers.set([...previousList]);
      setTimeout(() => {
        this.equippers.update((list) =>
          list.map((e) => (e.id === id ? { ...e } : e)),
        );
      }, 0);
      return;
    }

    const normalizedPatch: Partial<EquipperDto> = { ...patch };
    if (
      normalizedPatch.user_id &&
      typeof (normalizedPatch.user_id as unknown) === 'object'
    ) {
      normalizedPatch.user_id = (
        normalizedPatch.user_id as unknown as { id: string }
      ).id;
    }

    try {
      // Optimistic update
      this.equippers.update((list) =>
        list.map((e) => (e.id === id ? { ...e, ...normalizedPatch } : e)),
      );

      const { error } = await this.supabase.client
        .from('equippers')
        .update(normalizedPatch)
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      handleErrorToast(e, this.toast);
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
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
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
      handleErrorToast(e, this.toast);
    }
  }
}

export default AdminEquippersListComponent;
