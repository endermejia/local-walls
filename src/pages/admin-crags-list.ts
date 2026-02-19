import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAppearance,
  TuiButton,
  TuiLoader,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';

import { CragDto } from '../models';
import { CragsService } from '../services';

type CragAdminItem = CragDto & { area?: { name: string } };

@Component({
  selector: 'app-admin-crags-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TuiAppearance,
    TuiButton,
    TuiLoader,
    TuiPagination,
    TuiTable,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4 w-full max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <h1 tuiTitle>Crags Admin</h1>
        <tui-textfield iconStart="@tui.search" class="w-full max-w-md">
          <input
            tuiTextfield
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search crags..."
          />
        </tui-textfield>
      </div>

      <div class="border rounded-lg overflow-auto relative min-h-[200px]">
        @if (cragsResource.isLoading()) {
          <tui-loader class="absolute inset-0 z-10" [overlay]="true" />
        }

        <table tuiTable [columns]="columns" class="w-full">
          <thead>
            <tr tuiThGroup>
              <th *tuiHead="'id'" tuiTh [sticky]="true" class="w-20">ID</th>
              <th *tuiHead="'name'" tuiTh [sticky]="true">Name</th>
              <th *tuiHead="'slug'" tuiTh [sticky]="true">Slug</th>
              <th *tuiHead="'area'" tuiTh [sticky]="true">Area</th>
              <th *tuiHead="'8a'" tuiTh [sticky]="true">
                8a Slugs (comma sep)
              </th>
              <th *tuiHead="'actions'" tuiTh [sticky]="true" class="w-32"></th>
            </tr>
          </thead>
          <tbody tuiTbody [data]="data()">
            @for (item of data(); track item.id) {
              <tr tuiTr>
                <td *tuiCell="'id'" tuiTd>
                  <!-- Assuming route is /area/:areaSlug/:cragSlug -->
                  <a [routerLink]="['/area', item.area?.name || 'unknown', item.slug]" class="tui-link">{{ item.id }}</a>
                </td>
                <td *tuiCell="'name'" tuiTd>
                  <tui-textfield>
                    <input
                      tuiTextfield
                      [(ngModel)]="item.name"
                      (ngModelChange)="markDirty(item.id)"
                    />
                  </tui-textfield>
                </td>
                <td *tuiCell="'slug'" tuiTd>
                  <tui-textfield>
                    <input
                      tuiTextfield
                      [(ngModel)]="item.slug"
                      (ngModelChange)="markDirty(item.id)"
                    />
                  </tui-textfield>
                </td>
                <td *tuiCell="'area'" tuiTd>
                  {{ item.area?.name || item.area_id }}
                </td>
                <td *tuiCell="'8a'" tuiTd>
                  <tui-textfield>
                    <input
                      tuiTextfield
                      [ngModel]="getSlugsString(item)"
                      (ngModelChange)="
                        setSlugsString(item, $event); markDirty(item.id)
                      "
                    />
                  </tui-textfield>
                </td>
                <td *tuiCell="'actions'" tuiTd>
                  @if (isDirty(item.id)) {
                    <button
                      tuiButton
                      size="s"
                      appearance="primary"
                      (click)="save(item)"
                      [iconStart]="
                        saving() === item.id ? '@tui.loader' : '@tui.save'
                      "
                      [disabled]="saving() === item.id"
                    >
                      Save
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              @if (!cragsResource.isLoading()) {
                <tr tuiTr>
                  <td
                    [attr.colspan]="columns.length"
                    tuiTd
                    class="text-center p-4"
                  >
                    No crags found
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <tui-pagination
        [length]="totalPages()"
        [index]="page()"
        (indexChange)="onPageChange($event)"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCragsListComponent {
  private readonly cragsService = inject(CragsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly columns = ['id', 'name', 'slug', 'area', '8a', 'actions'];

  readonly search = signal('');
  readonly searchTerm = signal('');
  readonly page = signal(0);
  readonly pageSize = signal(20);

  readonly dirtySet = signal<Set<number>>(new Set());
  readonly saving = signal<number | null>(null);

  readonly cragsResource = resource({
    params: () => ({
      page: this.page(),
      search: this.search(),
      pageSize: this.pageSize(),
    }),
    loader: async ({ params }) => {
      if (!isPlatformBrowser(this.platformId)) return { data: [], count: 0 };
      return await this.cragsService.getCragsAdmin(
        params.page,
        params.pageSize,
        params.search,
      );
    },
  });

  readonly data = computed(() => this.cragsResource.value()?.data || []);
  readonly total = computed(() => this.cragsResource.value()?.count || 0);

  readonly totalPages = computed(() =>
    Math.ceil(this.total() / this.pageSize()),
  );

  private searchTimeout: any;

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.search.set(value);
      this.page.set(0);
    }, 300);
  }

  onPageChange(index: number) {
    this.page.set(index);
  }

  getSlugsString(item: CragAdminItem): string {
    return (item.eight_anu_sector_slugs || []).join(', ');
  }

  setSlugsString(item: CragAdminItem, value: string) {
    item.eight_anu_sector_slugs = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s);
  }

  markDirty(id: number) {
    this.dirtySet.update((set) => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
  }

  isDirty(id: number): boolean {
    return this.dirtySet().has(id);
  }

  async save(item: CragAdminItem) {
    this.saving.set(item.id);
    try {
      await this.cragsService.update(item.id, {
        name: item.name,
        slug: item.slug,
        eight_anu_sector_slugs: item.eight_anu_sector_slugs,
      });
      this.dirtySet.update((set) => {
        const newSet = new Set(set);
        newSet.delete(item.id);
        return newSet;
      });
    } finally {
      this.saving.set(null);
    }
  }
}
