import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiScrollbar, TuiTextfield } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiChevron,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GlobalData, SupabaseService } from '../services';
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
    FormsModule,
    TuiAvatar,
    TuiChevron,
    TuiDataListWrapper,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiTable,
    TuiTextfield,
    TranslatePipe,
    WaIntersectionObserver,
  ],
  template: `
    <section class="w-full max-w-6xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-avatar
            tuiThumbnail
            size="l"
            src="@tui.users"
            class="self-center"
            [attr.aria-label]="'admin.users.title' | translate"
          />
          @let usersCount = users().length;
          {{ 'admin.users.title' | translate }}
          ({{ usersCount }})
        </h1>
      </header>

      <tui-scrollbar waIntersectionRoot class="scrollbar" [hidden]="true">
        <table
          size="l"
          tuiTable
          class="table"
          [columns]="columns"
          [(direction)]="direction"
          [(tuiSortBy)]="sorter"
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

          <tbody tuiTbody [data]="sortedUsers()">
            @if (loading()) {
              @for (item of skeletons; track $index) {
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
              @let usersList = sortedUsers();
              @for (user of usersList; track user.id) {
                <tr tuiTr [class.is-current]="user.id === currentUserId()">
                  <td *tuiCell="'user'" tuiTd class="user-cell">
                    <div class="flex items-center gap-3">
                      <tui-avatar
                        size="m"
                        [src]="supabase.buildAvatarUrl(user.avatar)"
                      />
                      <span class="font-medium">
                        {{ user.name || ('labels.anonymous' | translate) }}
                        @if (user.id === currentUserId()) {
                          <span class="text-xs opacity-60 ml-1">
                            ({{ 'labels.you' | translate }})
                          </span>
                        }
                      </span>
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
export class UsersListAdminComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);

  protected readonly AppRoles = AppRoles;
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

  protected readonly currentUserId = computed(
    () => this.supabase.authUser()?.id,
  );
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly users: WritableSignal<UserWithRole[]> = signal([]);

  protected readonly skeletons = Array(25).fill(0);
  protected readonly sorter: WritableSignal<'user' | 'role' | null> =
    signal(null);
  protected readonly direction: WritableSignal<-1 | 1> = signal(1);

  protected readonly userSorter = (a: UserWithRole, b: UserWithRole): number =>
    (a.name || '').localeCompare(b.name || '');

  protected readonly roleSorter = (a: UserWithRole, b: UserWithRole): number =>
    (a.role || '').localeCompare(b.role || '');

  protected readonly sortedUsers = computed(() => {
    const list = [...this.users()];
    const sortBy = this.sorter();
    const dir = this.direction();

    if (!sortBy) return list;

    const sorterFn = sortBy === 'user' ? this.userSorter : this.roleSorter;
    return list.sort((a, b) => dir * sorterFn(a, b));
  });

  constructor() {
    this.loadUsers();
  }

  protected trackById(index: number, user: UserWithRole): string {
    return user.id;
  }

  private async loadUsers(): Promise<void> {
    try {
      this.loading.set(true);

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
    } catch (error) {
      console.error('[UsersListAdmin] Exception loading users:', error);
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
    } catch (error) {
      console.error('[UsersListAdmin] Exception updating role:', error);
      // Revert the change in the UI
      await this.loadUsers();
    }
  }
}

export default UsersListAdminComponent;
