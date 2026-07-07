import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
  signal,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { GlobalData } from '../../services/global-data';

import {
  TuiLoader,
  TuiButton,
  TuiScrollbar,
  TuiLink,
  TuiHint,
  TuiCheckbox,
} from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import {
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableCell,
  TuiTableHead,
} from '@taiga-ui/addon-table';

import { IndoorService } from '../../services/indoor.service';
import { AscentsService } from '../../services/ascents.service';
import { IndoorRouteWithExtras } from '../../models';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import { IndoorRouteEquippersInputComponent } from '../route/indoor-route-equippers-input';

@Component({
  selector: 'app-indoor-routes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterLink,
    TuiLoader,
    TuiBadge,
    TuiButton,
    TuiScrollbar,
    TuiLink,
    TuiHint,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableCell,
    TuiTableHead,
    GradeComponent,
    EmptyStateComponent,
    IndoorRouteEquippersInputComponent,
    TuiCheckbox,
  ],
  template: `
    <div class="flex flex-col gap-4">
      @if (hasAnyRoutes()) {
        <div class="flex items-center justify-between px-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              tuiCheckbox
              type="checkbox"
              [ngModel]="showLegacy()"
              (ngModelChange)="showLegacy.set($event)"
              autocomplete="off"
            />
            <span class="text-sm select-none">{{
              'indoor.showLegacy' | translate
            }}</span>
          </label>

          @if (canEdit()) {
            <button
              tuiButton
              appearance="textfield"
              size="s"
              iconStart="@tui.plus"
              (click.zoneless)="createRoute()"
            >
              {{ 'new' | translate }}
            </button>
          }
        </div>
      } @else if (canEdit()) {
        <div class="flex justify-end px-3">
          <button
            tuiButton
            appearance="textfield"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createRoute()"
          >
            {{ 'new' | translate }}
          </button>
        </div>
      }

      @if (routes().length > 0) {
        @let isMobile = global.isMobile();
        <tui-scrollbar class="grow min-h-0 no-scrollbar">
          <table
            tuiTable
            [size]="isMobile ? 's' : 'm'"
            class="w-full"
            [columns]="columns()"
          >
            <thead tuiThead>
              <tr tuiThGroup>
                @for (col of columns(); track col) {
                  <th
                    *tuiHead="col"
                    tuiTh
                    [sorter]="null"
                    [class.text-right]="
                      col === 'actions' || col === 'admin_actions'
                    "
                    [class.w-20!]="col === 'grade'"
                    [class.w-24!]="col === 'color'"
                    [class.w-64!]="col === 'equippers'"
                    [class.w-16!]="col === 'actions'"
                    [class.w-28!]="col === 'admin_actions'"
                  >
                    {{
                      col === 'actions' || col === 'admin_actions'
                        ? ''
                        : (col | translate)
                    }}
                  </th>
                }
              </tr>
            </thead>
            <tbody tuiTbody>
              @for (item of routes(); track item.id) {
                <tr tuiTr>
                  @for (col of columns(); track col) {
                    <td
                      *tuiCell="col"
                      tuiTd
                      [class.text-right]="
                        col === 'actions' || col === 'admin_actions'
                      "
                    >
                      @switch (col) {
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-grade
                              [grade]="item.grade || 0"
                              [kind]="item.climbing_kind"
                            />
                          </div>
                        }
                        @case ('route') {
                          <div tuiCell size="m">
                            <div
                              class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
                            >
                              <a
                                tuiLink
                                [routerLink]="[
                                  '/indoor',
                                  item.center_slug || centerSlug(),
                                  'route',
                                  item.slug,
                                ]"
                                class="font-bold text-base truncate max-w-full"
                              >
                                {{ item.name || ('route' | translate) }}
                              </a>
                              @if (item.legacy) {
                                <span
                                  tuiBadge
                                  size="s"
                                  appearance="neutral"
                                  class="uppercase text-[10px] shrink-0"
                                >
                                  {{ 'indoor.legacy' | translate }}
                                </span>
                              }
                            </div>
                          </div>
                        }
                        @case ('color') {
                          <div tuiCell size="m">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (item.color) {
                                <span
                                  class="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 block shrink-0"
                                  [style.backgroundColor]="item.color"
                                ></span>
                                <span class="text-sm truncate">
                                  {{
                                    item.color.startsWith('#')
                                      ? item.color
                                      : ('colors.' + item.color | translate)
                                  }}
                                </span>
                              } @else {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            </div>
                          </div>
                        }
                        @case ('equippers') {
                          <div tuiCell size="m" class="grow min-w-0">
                            @if (canEdit()) {
                              <app-indoor-route-equippers-input
                                [route]="item"
                              />
                              <div class="flex flex-wrap gap-1 items-center">
                                @for (eq of item.equippers; track eq.id) {
                                  <button
                                    tuiButton
                                    appearance="secondary"
                                    size="xs"
                                    class="min-w-fit! px-2!"
                                    [routerLink]="['/equipper', eq.id]"
                                  >
                                    {{ eq.name }}
                                  </button>
                                } @empty {
                                  <span class="opacity-50 text-xs">-</span>
                                }
                              </div>
                            }
                          </div>
                        }
                        @case ('actions') {
                          <button
                            size="m"
                            appearance="neutral"
                            iconStart="@tui.circle-plus"
                            tuiIconButton
                            type="button"
                            class="rounded-full!"
                            [tuiHint]="'ascent.new' | translate"
                            (click.zoneless)="logAscent(item)"
                          >
                            {{ 'ascent.new' | translate }}
                          </button>
                        }
                        @case ('admin_actions') {
                          <div class="flex gap-1 justify-end items-center">
                            <button
                              size="s"
                              appearance="neutral"
                              iconStart="@tui.square-pen"
                              tuiIconButton
                              type="button"
                              class="rounded-full!"
                              [tuiHint]="'edit' | translate"
                              (click.zoneless)="editRoute(item)"
                            >
                              {{ 'edit' | translate }}
                            </button>
                            <button
                              size="s"
                              appearance="negative"
                              iconStart="@tui.trash"
                              tuiIconButton
                              type="button"
                              class="rounded-full!"
                              [tuiHint]="'delete' | translate"
                              (click.zoneless)="deleteRoute(item)"
                            >
                              {{ 'delete' | translate }}
                            </button>
                          </div>
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </tui-scrollbar>
      } @else if (routesResource.isLoading()) {
        <tui-loader />
      } @else {
        <app-empty-state />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRoutesComponent {
  centerId = input<string | undefined>(undefined);
  centerSlug = input<string | undefined>(undefined);
  customRoutes = input<IndoorRouteWithExtras[] | null>(null);

  protected readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);
  private readonly ascentsService = inject(AscentsService);

  protected readonly columns = computed(() => {
    const cols = ['grade', 'route', 'color', 'equippers'];
    if (this.centerSlug() || this.routes().some((r) => r.center_slug)) {
      cols.push('actions');
    }
    if (this.canEdit()) {
      cols.push('admin_actions');
    }
    return cols;
  });

  protected readonly canEdit = computed(() => {
    const id = this.centerId();
    return id ? !!this.global.indoorAdminPermissions()[id] : false;
  });

  protected readonly showLegacy = signal<boolean>(
    (() => {
      try {
        return (
          typeof window !== 'undefined' &&
          localStorage.getItem('show_legacy_routes') === 'true'
        );
      } catch {
        return false;
      }
    })(),
  );

  constructor() {
    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('show_legacy_routes', String(this.showLegacy()));
        }
      } catch {}
    });
  }

  protected readonly hasAnyRoutes = computed(() => {
    return (
      this.centerId() !== undefined || (this.customRoutes() || []).length > 0
    );
  });

  protected readonly routes = computed<IndoorRouteWithExtras[]>(() => {
    const custom = this.customRoutes();
    const list = custom !== null ? custom : this.routesResource.value() || [];
    if (custom !== null && !this.showLegacy()) {
      return list.filter((r) => !r.legacy);
    }
    return list;
  });

  protected readonly routesResource = resource<
    IndoorRouteWithExtras[],
    { id: string | undefined; showLegacy: boolean }
  >({
    params: () => ({ id: this.centerId(), showLegacy: this.showLegacy() }),
    loader: ({ params }) =>
      params.id
        ? this.indoor.getCenterRoutes(params.id, params.showLegacy)
        : Promise.resolve([]),
  });

  async createRoute(): Promise<void> {
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoor.openIndoorRouteForm(id);
    if (success) {
      this.routesResource.reload();
    }
  }

  async editRoute(route: IndoorRouteWithExtras): Promise<void> {
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoor.openIndoorRouteForm(id, route);
    if (success) {
      this.routesResource.reload();
    }
  }

  async deleteRoute(route: IndoorRouteWithExtras): Promise<void> {
    if (confirm(this.translate.instant('deleteCommentConfirm'))) {
      await this.indoor.deleteRoute(route.id);
      if (this.centerId()) {
        this.routesResource.reload();
      }
    }
  }

  async logAscent(route: IndoorRouteWithExtras): Promise<void> {
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: route.id,
        routeName: route.name,
        isIndoor: true,
        climbingKind: route.climbing_kind as any,
        grade: route.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      if (this.centerId()) {
        this.routesResource.reload();
      }
    }
  }
}
