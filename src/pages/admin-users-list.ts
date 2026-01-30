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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort, TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiDataList,
  TuiLink,
  TuiOptGroup,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
  TuiDataListWrapper,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiMultiSelect,
  TuiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppRole, AppRoles, AreaListItem } from '../models';

import { GlobalData, SupabaseService } from '../services';

import { EmptyStateComponent } from '../components';

interface UserWithRole {
  id: string;
  name: string | null;
  avatar: string | null;
  role: AppRole;
  assignedAreas: AreaListItem[];
  areasControl: FormControl<AreaListItem[]>;
}

@Component({
  selector: 'app-users-list-admin',
  imports: [
    EmptyStateComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiFilterByInputPipe,
    TuiInputChip,
    TuiLink,
    TuiMultiSelect,
    TuiOptGroup,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiTable,
    TuiTableSortPipe,
    TuiTextfield,
    TuiTitle,
    WaIntersectionObserver,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (users().length; as usersCount) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              >
                {{ usersCount }}
              </tui-badge-notification>
            }
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.users"
              class="self-center"
              [attr.aria-label]="'admin.users.title' | translate"
            />
          </tui-badged-content>
          {{ 'admin.users.title' | translate }}
        </h1>
      </header>

      <div class="mb-6 flex flex-col md:flex-row gap-4">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="user-search">{{
            'labels.search' | translate
          }}</label>
          <input
            id="user-search"
            tuiTextfield
            type="text"
            autocomplete="off"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'labels.user' | translate"
          />
        </tui-textfield>

        <tui-textfield
          tuiChevron
          class="min-w-[200px]"
          [tuiTextfieldCleaner]="false"
          [stringify]="stringifyRoleFilter"
        >
          <label tuiLabel for="role-filter">{{
            'labels.role' | translate
          }}</label>
          <input
            id="role-filter"
            tuiSelect
            [ngModel]="roleFilter()"
            (ngModelChange)="roleFilter.set($event)"
          />
          <tui-data-list-wrapper
            *tuiTextfieldDropdown
            new
            [items]="roleFilterOptions"
          />
        </tui-textfield>
      </div>

      <tui-scrollbar waIntersectionRoot class="flex grow">
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
              <th
                *tuiHead="'user'"
                tuiTh
                class="user-column"
                [sorter]="userSorter"
                [sticky]="true"
              >
                {{ 'labels.user' | translate }}
              </th>
              <th
                *tuiHead="'role'"
                tuiTh
                class="role-column !w-48"
                [sorter]="roleSorter"
                [sticky]="true"
              >
                {{ 'labels.role' | translate }}
              </th>
              <th
                *tuiHead="'areas'"
                tuiTh
                class="areas-column !w-80"
                [sorter]="null"
              >
                {{ 'labels.areas' | translate }}
              </th>
            </tr>
          </thead>

          @let sortedUsersList = filteredUsers() | tuiTableSort;
          <tbody tuiTbody [data]="sortedUsersList">
            @if (loading()) {
              @for (_item of skeletons; track $index) {
                <tr tuiTr>
                  <td *tuiCell="'user'" tuiTd class="user-cell">
                    <div class="flex items-center gap-3">
                      <div
                        [tuiSkeleton]="true"
                        class="w-10 h-10 rounded-full"
                      ></div>
                      <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                    </div>
                  </td>
                  <td *tuiCell="'role'" tuiTd class="role-cell">
                    <div [tuiSkeleton]="true" class="w-full h-10"></div>
                  </td>
                </tr>
              }
            } @else {
              @for (user of sortedUsersList; track user.id) {
                <tr tuiTr [class.is-current]="user.id === currentUserId()">
                  <td *tuiCell="'user'" tuiTd class="user-cell">
                    <div class="flex items-center gap-3">
                      <a [routerLink]="['/profile', user.id]">
                        <tui-avatar
                          size="m"
                          [src]="supabase.buildAvatarUrl(user.avatar)"
                        />
                      </a>
                      <div class="flex flex-col">
                        <a
                          tuiLink
                          [routerLink]="['/profile', user.id]"
                          class="font-medium"
                        >
                          {{ user.name || ('labels.anonymous' | translate) }}
                        </a>
                        @if (user.id === currentUserId()) {
                          <span class="text-xs opacity-60">
                            ({{ 'labels.you' | translate }})
                          </span>
                        }
                      </div>
                    </div>
                  </td>
                  <td *tuiCell="'role'" tuiTd class="role-cell">
                    <tui-textfield
                      tuiChevron
                      class="role-select"
                      [tuiTextfieldCleaner]="false"
                      [stringify]="stringifyRole()"
                    >
                      <input
                        tuiSelect
                        [disabled]="user.id === currentUserId()"
                        [ngModel]="user.role"
                        [ngModelOptions]="options"
                        (ngModelChange)="onRoleChange($event, user)"
                      />
                      <tui-data-list-wrapper
                        *tuiTextfieldDropdown
                        new
                        [items]="roleOptions"
                      />
                    </tui-textfield>
                  </td>
                  <td *tuiCell="'areas'" tuiTd class="areas-column">
                    @if (user.role === 'equipper') {
                      <tui-textfield
                        multi
                        tuiChevron
                        [stringify]="stringifyArea"
                        [disabledItemHandler]="strings"
                        [identityMatcher]="areaIdentityMatcher"
                        [tuiTextfieldCleaner]="false"
                      >
                        <input
                          tuiInputChip
                          id="areas-select-{{ user.id }}"
                          [formControl]="user.areasControl"
                          [placeholder]="'actions.select' | translate"
                        />
                        <tui-input-chip *tuiItem />
                        <tui-data-list *tuiTextfieldDropdown>
                          <tui-opt-group
                            [label]="'labels.areas' | translate"
                            tuiMultiSelectGroup
                          >
                            @for (
                              area of availableAreas() | tuiFilterByInput;
                              track area.id
                            ) {
                              <button
                                type="button"
                                new
                                tuiOption
                                [value]="area"
                              >
                                <div tuiCell size="s">
                                  <div tuiTitle>
                                    {{ area.name }}
                                  </div>
                                </div>
                              </button>
                            }
                          </tui-opt-group>
                        </tui-data-list>
                      </tui-textfield>
                    }
                  </td>
                </tr>
              } @empty {
                <tr tuiTr>
                  <td [attr.colspan]="columns().length" tuiTd>
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
      .is-current {
        background-color: var(--tui-status-info-pale);
      }

      .user-column {
        min-width: 250px;
      }

      .role-column {
        min-width: 200px;
      }

      .areas-column {
        min-width: 300px;
      }

      .user-cell {
        padding: 1rem 0.5rem;
      }

      .role-cell {
        padding: 1rem 0.5rem;
      }

      .role-select {
        width: 100%;
        max-width: 300px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminUsersListComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);

  protected readonly options = { updateOn: 'blur' } as const;
  protected readonly columns = computed(() => {
    const cols = ['user', 'role', 'areas'];
    return this.global.isMobile() ? cols.filter((c) => c !== 'areas') : cols;
  });

  protected readonly roleOptions = [
    AppRoles.CLIMBER,
    AppRoles.EQUIPPER,
    AppRoles.ADMIN,
  ];

  protected readonly stringifyRole = computed(() => {
    this.global.i18nTick();
    return (x: unknown): string => {
      if (typeof x !== 'string') return String(x);
      const key = `options.roles.${x}`;
      const tr = this.translate.instant(key);
      return tr && tr !== key ? tr : x;
    };
  });

  protected readonly stringifyRoleFilter = (x: unknown): string => {
    if (x === 'ALL') return this.translate.instant('labels.all');
    return this.stringifyRole()(x);
  };

  protected readonly searchQuery = signal('');
  protected readonly roleFilter = signal<AppRole | 'ALL'>('ALL');
  protected readonly roleFilterOptions = ['ALL', ...this.roleOptions];

  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    let list = this.users();

    if (query) {
      list = list.filter((u) => (u.name || '').toLowerCase().includes(query));
    }

    if (role !== 'ALL') {
      list = list.filter((u) => u.role === role);
    }

    return list;
  });

  protected readonly currentUserId = computed(
    () => this.supabase.authUser()?.id,
  );
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly users: WritableSignal<UserWithRole[]> = signal([]);

  protected readonly availableAreas = computed(() => this.global.areaList());
  protected readonly stringifyArea = (a: AreaListItem) => a.name;
  protected readonly areaIdentityMatcher: TuiIdentityMatcher<AreaListItem> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly strings = tuiIsString;

  protected readonly skeletons = Array(25).fill(0);
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<UserWithRole>>((a, b) =>
    tuiDefaultSort(a.name || '', b.name || ''),
  );

  protected userSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.name || '', b.name || '');

  protected roleSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.role || '', b.role || '');

  protected onSortChange(sort: TuiTableSortChange<UserWithRole>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.userSorter);
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadUsers();
    }

    this.global.resetDataByPage('home');
  }

  private async loadUsers(): Promise<void> {
    try {
      this.loading.set(true);
      await this.supabase.whenReady();

      // 1. Load areas if not already loaded
      if (this.global.areaList().length === 0) {
        // Wait for areas to load if needed
        while (this.global.areasListResource.isLoading()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      const areas = this.global.areaList();
      const areasMap = new Map(areas.map((a) => [a.id, a]));

      // 2. Fetch user profiles
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar');

      if (profilesError) throw profilesError;
      if (!profiles) {
        this.users.set([]);
        return;
      }

      // 3. Fetch all user roles
      const { data: roles, error: rolesError } = await this.supabase.client
        .from('user_roles')
        .select('id, role');

      if (rolesError) throw rolesError;

      // 4. Fetch all area-equipper mappings
      const { data: mappings, error: mappingsError } =
        await this.supabase.client.from('area_equippers').select('*');

      if (mappingsError) throw mappingsError;

      const rolesMap = new Map(
        (roles || []).map((r) => [r.id, r.role as AppRole]),
      );

      const mappingsByEquipper = new Map<string, number[]>();
      (mappings || []).forEach((m) => {
        const list = mappingsByEquipper.get(m.equipper_id) || [];
        list.push(m.area_id);
        mappingsByEquipper.set(m.equipper_id, list);
      });

      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const assignedAreaIds = mappingsByEquipper.get(profile.id) || [];
        const assignedAreas = assignedAreaIds
          .map((id) => areasMap.get(id))
          .filter((a): a is AreaListItem => !!a);

        const control = new FormControl(assignedAreas, { nonNullable: true });
        control.valueChanges.subscribe((newAreas) => {
          void this.onAreasChange(profile.id, newAreas);
        });

        return {
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          role: rolesMap.get(profile.id) || AppRoles.CLIMBER,
          assignedAreas,
          areasControl: control,
        };
      });

      this.users.set(usersWithRoles);
    } catch (e) {
      console.error('[UsersListAdmin] Exception loading users:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected async onRoleChange(
    newRole: AppRole,
    user: UserWithRole,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) {
        console.error('[UsersListAdmin] Error updating role:', error);
        // Revert the change in the UI
        await this.loadUsers();
        return;
      }

      // Update local state
      const updatedUsers = this.users().map((u) =>
        u.id === user.id ? { ...u, role: newRole } : u,
      );
      this.users.set(updatedUsers);

      console.log(
        `[UsersListAdmin] Role updated for user ${user.name}: ${newRole}`,
      );
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating role:', e);
      // Revert the change in the UI
      await this.loadUsers();
    }
  }

  protected async onAreasChange(
    userId: string,
    newAreas: AreaListItem[],
  ): Promise<void> {
    try {
      // 1. Get current mappings for this user from the local state
      const user = this.users().find((u) => u.id === userId);
      if (!user) return;

      const oldAreaIds = user.assignedAreas.map((a) => a.id);
      const newAreaIds = newAreas.map((a) => a.id);

      // 2. Determine what to add and what to remove
      const toAdd = newAreaIds.filter((id) => !oldAreaIds.includes(id));
      const toRemove = oldAreaIds.filter((id) => !newAreaIds.includes(id));

      if (toAdd.length === 0 && toRemove.length === 0) return;

      // 3. Update the database
      if (toAdd.length > 0) {
        const { error: addError } = await this.supabase.client
          .from('area_equippers')
          .insert(toAdd.map((area_id) => ({ equipper_id: userId, area_id })));
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await this.supabase.client
          .from('area_equippers')
          .delete()
          .eq('equipper_id', userId)
          .in('area_id', toRemove);
        if (removeError) throw removeError;
      }

      // 4. Update the local user object (so that next change is compared correctly)
      user.assignedAreas = newAreas;

      console.log(`[UsersListAdmin] Mappings updated for user ${userId}`);
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating areas:', e);
      // We should probably reload to be safe, but it might create an infinite loop with control.valueChanges
      // Better way: just log and maybe alert user.
    }
  }
}

export default AdminUsersListComponent;
