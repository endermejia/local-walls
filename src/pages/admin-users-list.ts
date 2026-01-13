import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import {
  TuiTable,
  TuiSortDirection,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import { TuiLink, TuiScrollbar, TuiTextfield } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiBadgeNotification,
  TuiChevron,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GlobalData, SupabaseService } from '../services';
import { EmptyStateComponent } from '../components';
import { AppRole, AppRoles } from '../models';

interface UserWithRole {
  id: string;
  name: string | null;
  avatar: string | null;
  role: AppRole;
}

@Component({
  selector: 'app-users-list-admin',
  standalone: true,
  imports: [
    EmptyStateComponent,
    FormsModule,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiChevron,
    TuiDataListWrapper,
    TuiLink,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiTable,
    TuiTableSortPipe,
    TuiTextfield,
    WaIntersectionObserver,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (users().length; as usersCount) {
              <tui-badge-notification size="s" tuiSlot="top">
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

      <tui-scrollbar waIntersectionRoot class="scrollbar">
        <table
          size="l"
          tuiTable
          class="table"
          [columns]="columns"
          [direction]="direction()"
          [sorter]="sorter()"
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
                class="role-column"
                [sorter]="roleSorter"
                [sticky]="true"
              >
                {{ 'labels.role' | translate }}
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
                          class="cursor-pointer"
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
        max-height: calc(100vh - 200px);
      }

      .is-current {
        background-color: var(--tui-status-info-pale);
      }

      .table {
        width: 100%;
      }

      .user-column {
        min-width: 250px;
      }

      .role-column {
        min-width: 200px;
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
  host: { class: 'overflow-auto' },
})
export class AdminUsersListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly supabase = inject(SupabaseService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);

  protected readonly options = { updateOn: 'blur' } as const;
  protected readonly columns = ['user', 'role'] as const;

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

  protected readonly skeletons = Array(25).fill(0);
  protected readonly direction = signal(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<UserWithRole>>((a, b) =>
    tuiDefaultSort(a.name || '', b.name || ''),
  );

  protected userSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.name || '', b.name || '');

  protected roleSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.role || '', b.role || '');

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

      // Fetch user profiles and roles with a join
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar');

      if (profilesError) {
        console.error(
          '[UsersListAdmin] Error fetching profiles:',
          profilesError,
        );
        return;
      }

      if (!profiles) {
        this.users.set([]);
        return;
      }

      // Fetch all user roles
      const { data: roles, error: rolesError } = await this.supabase.client
        .from('user_roles')
        .select('id, role');

      if (rolesError) {
        console.error('[UsersListAdmin] Error fetching roles:', rolesError);
        return;
      }

      // Combine profiles and roles
      const rolesMap = new Map(
        (roles || []).map((r) => [r.id, r.role as AppRole]),
      );

      const usersWithRoles: UserWithRole[] = profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        role: rolesMap.get(profile.id) || AppRoles.CLIMBER,
      }));

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
}

export default AdminUsersListComponent;
