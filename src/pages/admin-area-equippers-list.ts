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
  TuiButton,
  TuiDataList,
  TuiHint,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiBadgeNotification,
  TuiChevron,
  type TuiConfirmData,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AppRoles, AreaListItem, UserProfileDto } from '../models';

import { GlobalData, SupabaseService, ToastService } from '../services';

import { EmptyStateComponent } from '../components';

import { handleErrorToast } from '../utils';

interface AreaEquipperMapping {
  id: number;
  area_id: number;
  equipper_id: string;
  area_name: string;
  equipper_name: string;
  equipper_avatar: string | null;
}

@Component({
  selector: 'app-admin-area-equippers-list',
  imports: [
    EmptyStateComponent,
    FormsModule,
    TranslatePipe,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiButton,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiHint,
    TuiScrollbar,
    TuiSelect,
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
            @if (mappings().length; as count) {
              <tui-badge-notification size="s" tuiSlot="top">
                {{ count }}
              </tui-badge-notification>
            }
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.hammer"
              class="self-center"
              [attr.aria-label]="'nav.admin-area-equippers' | translate"
            />
          </tui-badged-content>

          {{ 'nav.admin-area-equippers' | translate }}
        </h1>
      </header>

      <div class="mb-6 bg-[var(--tui-background-neutral-1)] p-4 rounded-2xl">
        <h2 class="text-lg font-semibold mb-4">
          {{ 'labels.assignArea' | translate }}
        </h2>
        <div class="flex flex-col md:flex-row gap-4">
          <tui-textfield tuiChevron class="grow" [stringify]="stringifyUser">
            <label tuiLabel for="user-select">{{
              'labels.user' | translate
            }}</label>
            <input
              id="user-select"
              tuiSelect
              [ngModel]="selectedUser()"
              (ngModelChange)="selectedUser.set($event)"
            />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [items]="equipperUsers()"
            />
          </tui-textfield>

          <tui-textfield tuiChevron class="grow" [stringify]="stringifyArea">
            <label tuiLabel for="area-select">{{
              'labels.area' | translate
            }}</label>
            <input
              id="area-select"
              tuiSelect
              [ngModel]="selectedArea()"
              (ngModelChange)="selectedArea.set($event)"
            />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [items]="allAreas()"
            />
          </tui-textfield>

          <button
            tuiButton
            appearance="primary"
            class="self-end"
            [disabled]="!selectedUser() || !selectedArea()"
            (click.zoneless)="addMapping()"
          >
            {{ 'actions.create' | translate }}
          </button>
        </div>
      </div>

      <tui-scrollbar class="flex grow">
        <table
          size="l"
          tuiTable
          class="w-full"
          [columns]="columns"
          [direction]="direction()"
          [sorter]="sorter()"
          (sortChange)="onSortChange($event)"
        >
          <thead tuiThead>
            <tr tuiThGroup>
              <th *tuiHead="'equipper'" tuiTh [sorter]="equipperSorter">
                {{ 'labels.equipper' | translate }}
              </th>
              <th *tuiHead="'area'" tuiTh [sorter]="areaSorter">
                {{ 'labels.area' | translate }}
              </th>
              <th *tuiHead="'actions'" tuiTh [sorter]="null"></th>
            </tr>
          </thead>

          @let list = mappings() | tuiTableSort;
          <tbody tuiTbody [data]="list">
            @if (loading()) {
              @for (_item of skeletons; track $index) {
                <tr tuiTr>
                  <td *tuiCell="'equipper'" tuiTd>
                    <div class="flex items-center gap-2">
                      <div
                        [tuiSkeleton]="true"
                        class="w-8 h-8 rounded-full"
                      ></div>
                      <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                    </div>
                  </td>
                  <td *tuiCell="'area'" tuiTd>
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
                  <td *tuiCell="'equipper'" tuiTd>
                    <div class="flex items-center gap-2">
                      <tui-avatar
                        size="s"
                        [src]="supabase.buildAvatarUrl(item.equipper_avatar)"
                      />
                      <span>{{ item.equipper_name }}</span>
                    </div>
                  </td>
                  <td *tuiCell="'area'" tuiTd>
                    {{ item.area_name }}
                  </td>
                  <td *tuiCell="'actions'" tuiTd>
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="!rounded-full"
                      [tuiHint]="'actions.removeAssignment' | translate"
                      (click.zoneless)="deleteMapping(item)"
                    >
                      {{ 'actions.removeAssignment' | translate }}
                    </button>
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminAreaEquippersListComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly columns = ['equipper', 'area', 'actions'] as const;

  protected readonly loading = signal(true);
  protected readonly mappings: WritableSignal<AreaEquipperMapping[]> = signal(
    [],
  );
  protected readonly equipperUsers: WritableSignal<UserProfileDto[]> = signal(
    [],
  );
  protected readonly allAreas = computed(() => this.global.areaList());

  protected readonly selectedUser = signal<UserProfileDto | null>(null);
  protected readonly selectedArea = signal<AreaListItem | null>(null);

  protected readonly skeletons = Array(10).fill(0);

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<AreaEquipperMapping>>(
    (a, b) => tuiDefaultSort(a.equipper_name, b.equipper_name),
  );

  protected readonly equipperSorter: TuiComparator<AreaEquipperMapping> = (
    a,
    b,
  ) => tuiDefaultSort(a.equipper_name, b.equipper_name);
  protected readonly areaSorter: TuiComparator<AreaEquipperMapping> = (a, b) =>
    tuiDefaultSort(a.area_name, b.area_name);

  protected readonly stringifyUser = (u: UserProfileDto) =>
    u.name || u.id.substring(0, 8);
  protected readonly stringifyArea = (a: AreaListItem) => a.name;

  protected onSortChange(sort: TuiTableSortChange<AreaEquipperMapping>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.equipperSorter);
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadData();
    }
    this.global.resetDataByPage('home');
  }

  private async loadData(): Promise<void> {
    try {
      this.loading.set(true);
      await this.supabase.whenReady();

      // 1. Fetch areas if not loaded
      if (this.global.areaList().length === 0) {
        // Wait for areas to load if needed
        while (this.global.areasListResource.isLoading()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // 2. Fetch all mappings
      const { data: rawMappings, error: mappingsError } = await this.supabase
        .client
        .from('area_equippers')
        .select('*');

      if (mappingsError) throw mappingsError;

      // 3. Fetch all users with 'equipper' role
      const { data: roles, error: rolesError } = await this.supabase.client
        .from('user_roles')
        .select('id')
        .eq('role', AppRoles.EQUIPPER);

      if (rolesError) throw rolesError;

      const equipperIds = (roles || []).map((r) => r.id);

      // 4. Fetch profiles for those users + users in mappings
      const allNeededUserIds = [
        ...new Set([
          ...equipperIds,
          ...(rawMappings || []).map((m) => m.equipper_id),
        ]),
      ];

      const { data: profiles, error: profilesError } = await this.supabase
        .client
        .from('user_profiles')
        .select('id, name, avatar')
        .in('id', allNeededUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]));

      // 5. Build mappings list
      const areas = this.global.areaList();
      const areasMap = new Map(areas.map((a) => [a.id, a]));

      const mappedData: AreaEquipperMapping[] = (rawMappings || [])
        .map((m) => {
          const area = areasMap.get(m.area_id);
          const profile = profilesMap.get(m.equipper_id);
          if (!area || !profile) return null;

          return {
            id: m.id,
            area_id: m.area_id,
            equipper_id: m.equipper_id,
            area_name: area.name,
            equipper_name: profile.name || 'Anonymous',
            equipper_avatar: profile.avatar,
          };
        })
        .filter((m): m is AreaEquipperMapping => m !== null);

      this.mappings.set(mappedData);

      // 6. Set equipper users for selection
      this.equipperUsers.set(
        equipperIds
          .map((id) => profilesMap.get(id))
          .filter((p): p is UserProfileDto => !!p),
      );
    } catch (e) {
      console.error('[AdminAreaEquippersList] Error loading data:', e);
      handleErrorToast(e as Error, this.toast);
    } finally {
      this.loading.set(false);
    }
  }

  protected async addMapping(): Promise<void> {
    const user = this.selectedUser();
    const area = this.selectedArea();
    if (!user || !area) return;

    try {
      const { data, error } = await this.supabase.client
        .from('area_equippers')
        .insert({
          equipper_id: user.id,
          area_id: area.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        this.mappings.update((list) => [
          ...list,
          {
            id: data.id,
            area_id: area.id,
            equipper_id: user.id,
            area_name: area.name,
            equipper_name: user.name || 'Anonymous',
            equipper_avatar: user.avatar,
          },
        ]);
        this.selectedUser.set(null);
        this.selectedArea.set(null);
        this.toast.success('messages.toasts.updateAvailable'); // Use a generic success message or add new one
      }
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
    }
  }

  protected deleteMapping(item: AreaEquipperMapping): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('actions.removeAssignment'),
        size: 's',
        data: {
          content: `${item.equipper_name} - ${item.area_name}`,
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.performDelete(item.id);
    });
  }

  private async performDelete(id: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('area_equippers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.mappings.update((list) => list.filter((m) => m.id !== id));
    } catch (e) {
      handleErrorToast(e as Error, this.toast);
    }
  }
}

export default AdminAreaEquippersListComponent;
