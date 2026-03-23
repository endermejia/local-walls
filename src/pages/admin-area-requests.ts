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
import { RouterLink } from '@angular/router';

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
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';

import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GlobalData } from '../services/global-data';
import { SupabaseService } from '../services/supabase.service';
import { AreasService } from '../services/areas.service';

interface AreaAdminRequest {
  id: number;
  created_at: string;
  area: { id: number; name: string; slug: string };
  user: { id: string; name: string | null };
}

import { EmptyStateComponent } from '../components/empty-state';

@Component({
  selector: 'app-admin-area-requests',
  imports: [
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
    TuiButton,
    TuiLink,
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
            @if (requests().length; as requestsCount) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              >
                {{ requestsCount }}
              </tui-badge-notification>
            }
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.shield"
              class="self-center"
              [attr.aria-label]="'adminRequests.manageTitle' | translate"
            />
          </tui-badged-content>
          {{ 'adminRequests.manageTitle' | translate }}
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ 'adminRequests.manageDescription' | translate }}
      </p>

      <tui-scrollbar class="flex grow">
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
              <th
                *tuiHead="'user'"
                tuiTh
                class="user-column"
                [sorter]="userSorter"
                [sticky]="true"
              >
                {{ 'adminRequests.user' | translate }}
              </th>
              <th
                *tuiHead="'area'"
                tuiTh
                class="area-column"
                [sorter]="areaSorter"
              >
                {{ 'adminRequests.area' | translate }}
              </th>
              <th
                *tuiHead="'actions'"
                tuiTh
                class="actions-column !w-48"
                [sorter]="null"
              >
                {{ 'actions' | translate }}
              </th>
            </tr>
          </thead>

          @let sortedList = requests() | tuiTableSort;
          <tbody tuiTbody [data]="sortedList">
            @if (loading()) {
              @for (_item of skeletons; track $index) {
                <tr tuiTr>
                  <td *tuiCell="'user'" tuiTd class="p-4">
                    <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                  </td>
                  <td *tuiCell="'area'" tuiTd class="p-4">
                    <div [tuiSkeleton]="true" class="w-48 h-4"></div>
                  </td>
                  <td *tuiCell="'actions'" tuiTd class="p-4">
                    <div
                      [tuiSkeleton]="true"
                      class="w-24 h-8 rounded-full"
                    ></div>
                  </td>
                </tr>
              }
            } @else {
              @for (req of sortedList; track req.id) {
                <tr tuiTr>
                  <td *tuiCell="'user'" tuiTd class="p-4">
                    <div class="flex flex-col">
                      <a
                        tuiLink
                        [routerLink]="['/profile', req.user.id]"
                        class="font-medium"
                      >
                        {{ req.user.name || ('anonymous' | translate) }}
                      </a>
                    </div>
                  </td>
                  <td *tuiCell="'area'" tuiTd class="p-4">
                    <div class="font-medium">
                      <a tuiLink [routerLink]="['/area', req.area.slug]">{{
                        req.area.name
                      }}</a>
                    </div>
                  </td>
                  <td *tuiCell="'actions'" tuiTd class="p-4">
                    <div class="flex gap-2 flex-wrap">
                      <button
                        tuiButton
                        size="m"
                        appearance="primary"
                        type="button"
                        class="!rounded-full"
                        (click.zoneless)="approve(req)"
                      >
                        {{ 'adminRequests.approve' | translate }}
                      </button>
                      <button
                        tuiButton
                        size="m"
                        appearance="secondary-destructive"
                        type="button"
                        class="!rounded-full"
                        (click.zoneless)="reject(req)"
                      >
                        {{ 'adminRequests.reject' | translate }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr tuiTr>
                  <td [attr.colspan]="columns().length" tuiTd>
                    <app-empty-state
                      icon="@tui.shield"
                      [message]="'adminRequests.empty' | translate"
                    />
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
      .user-column {
        min-width: 250px;
      }
      .area-column {
        min-width: 250px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminAreaRequestsComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly areas = inject(AreasService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly translate = inject(TranslateService);

  protected readonly columns = computed(() => ['user', 'area', 'actions']);

  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly requests: WritableSignal<AreaAdminRequest[]> = signal([]);

  protected readonly skeletons = Array(5).fill(0);
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<AreaAdminRequest>>((a, b) =>
    tuiDefaultSort(a.created_at, b.created_at),
  );

  protected userSorter: TuiComparator<AreaAdminRequest> = (a, b) =>
    tuiDefaultSort(a.user.name || '', b.user.name || '');

  protected areaSorter: TuiComparator<AreaAdminRequest> = (a, b) =>
    tuiDefaultSort(a.area.name || '', b.area.name || '');

  protected onSortChange(sort: TuiTableSortChange<AreaAdminRequest>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.userSorter);
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadRequests();
    }
  }

  private async loadRequests(): Promise<void> {
    try {
      this.loading.set(true);
      const reqs = await this.areas.getAreaAdminRequests();
      this.requests.set(reqs);
    } catch (e) {
      console.error('[AdminAreaRequests] Exception loading requests:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(req: AreaAdminRequest): Promise<void> {
    const success = await this.areas.approveAreaAdminRequest(
      req.id,
      req.area.id,
      req.user.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
      this.supabase.adminAreasResource.reload();
    }
  }

  protected async reject(req: AreaAdminRequest): Promise<void> {
    const success = await this.areas.rejectAreaAdminRequest(req.id);
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
export default AdminAreaRequestsComponent;
