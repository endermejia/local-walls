import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
} from '@taiga-ui/addon-table';
import type { TuiTableSortChange } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TuiDialogService } from '@taiga-ui/core';
import {
  TuiButton,
  TuiIcon,
  TuiLink,
  TuiTextfield,
  TuiScrollbar,
  TuiCell,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiInputNumber,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { topoPathToJson, type TopoRouteWithRoute } from '../../models';

import {
  AscentInfoPipe,
  TableSorterPipe,
  TopoIsRouteVisiblePipe,
  TopoRouteVisibilityStatePipe,
} from '../../pipes';
import { handleErrorToast } from '../../utils';

import { PaywallComponent } from '../paywall/paywall';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import type { TopoRouteRow } from './topo.types';

@Component({
  selector: 'app-topo-routes-table',
  standalone: true,
  imports: [
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    PaywallComponent,
    RouterLink,
    AscentInfoPipe,
    TableSorterPipe,
    TopoIsRouteVisiblePipe,
    TopoRouteVisibilityStatePipe,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiIcon,
    TuiInputNumber,
    TuiLink,
    TuiScrollbar,
    TuiTextfield,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
  ],
  template: `
    <div
      class="w-full h-full overflow-hidden px-4 md:px-0 lg:col-span-1 focus:outline-none"
      tabindex="0"
      (keydown)="onTableKeyDown($event)"
    >
      <tui-scrollbar class="h-full">
        @if (hasAccess()) {
          @let sortedData = sortedTableData();
          @if (sortedData.length > 0) {
            <table
              tuiTable
              [size]="isMobile() ? 's' : 'm'"
              class="w-full"
              [class.table-fixed]="isMobile()"
              [columns]="columns()"
              [direction]="direction()"
              [sorter]="sorter()"
              (sortChange)="onSortChange($event)"
            >
              <thead tuiThead>
                <tr tuiThGroup>
                  @for (col of columns(); track col) {
                    <th
                      *tuiHead="col"
                      tuiTh
                      [sorter]="col | tableSorter"
                      [class.text-center]="col !== 'name'"
                      [class.w-10!]="isMobile() && col === 'index'"
                      [class.w-12!]="
                        (!isMobile() && col === 'index') ||
                        (isMobile() && col === 'grade')
                      "
                      [class.w-20!]="!isMobile() && col === 'grade'"
                      [class.w-24!]="
                        (isMobile() &&
                          (col === 'actions' ||
                            col === 'admin_actions' ||
                            col === 'moves')) ||
                        (!isMobile() &&
                          (col === 'height' || col === 'admin_actions'))
                      "
                      [class.w-28!]="
                        !isMobile() && (col === 'actions' || col === 'moves')
                      "
                    >
                      <div class="items-center justify-center gap-1">
                        @switch (col) {
                          @case ('index') {
                            #
                          }
                          @case ('name') {
                            {{ 'routes.name' | translate }}
                          }
                          @case ('grade') {
                            {{ 'grade' | translate }}
                          }
                          @case ('height') {
                            {{ 'routes.height' | translate }}
                          }
                          @case ('moves') {
                            {{ 'moves' | translate }}
                          }
                        }
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              @for (
                item of sortedTableData();
                track item._ref.topo_id + '-' + item._ref.route_id;
                let i = $index
              ) {
                <tbody tuiTbody>
                  <tr
                    #routeRow
                    tuiTr
                    [id]="
                      'route-row-' +
                      item._ref.topo_id +
                      '-' +
                      item._ref.route_id
                    "
                    [class.outline-2]="item._ref.route_id === selectedRouteId()"
                    [class.outline-[var(--tui-border-focus)]]="
                      item._ref.route_id === selectedRouteId()
                    "
                    [class.-outline-offset-1]="
                      item._ref.route_id === selectedRouteId()
                    "
                    [style.background]="
                      item.climbed
                        ? (item._ref.route.own_ascent?.type | ascentInfo)
                            .backgroundSubtle
                        : item.project
                          ? 'var(--tui-status-info-pale)'
                          : ''
                    "
                    [class.opacity-50]="
                      isIndoor() &&
                      !(
                        item._ref.route_id
                        | topoIsRouteVisible: hiddenRouteIds()
                      )
                    "
                    class="group cursor-pointer"
                    (mouseenter)="hoveredRouteIdChange.emit(item._ref.route_id)"
                    (mouseleave)="hoveredRouteIdChange.emit(null)"
                    (click)="selectRoute(item._ref.route_id)"
                  >
                    @for (col of columns(); track col) {
                      <td
                        *tuiCell="col"
                        tuiTd
                        [class.text-center]="col !== 'name'"
                      >
                        @switch (col) {
                          @case ('index') {
                            <div tuiCell size="m" class="justify-center h-full">
                              @if (canEdit()) {
                                <tui-textfield
                                  tuiTextfieldSize="s"
                                  [class.w-16!]="!isMobile()"
                                  [class.w-10!]="isMobile()"
                                  class="h-8!"
                                >
                                  <input
                                    #indexInput
                                    tuiInputNumber
                                    [min]="1"
                                    class="text-center h-full! border-none! p-0! route-index-input"
                                    [ngModel]="item.index + 1"
                                    (blur.zoneless)="
                                      onUpdateRouteNumber(item, $event)
                                    "
                                    (keydown.enter)="
                                      onUpdateRouteNumber(item, $event);
                                      $event.stopPropagation()
                                    "
                                    (keydown)="onTableKeyDown($event, i)"
                                    autocomplete="off"
                                  />
                                </tui-textfield>
                              } @else {
                                {{ item.index + 1 }}
                              }
                            </div>
                          }
                          @case ('name') {
                            <div
                              tuiCell
                              size="m"
                              class="h-full items-center justify-between gap-2"
                            >
                              <div class="flex items-center gap-1.5 min-w-0">
                                @if (isIndoor()) {
                                  @let visState =
                                    item._ref.route_id
                                      | topoRouteVisibilityState
                                        : hiddenRouteIds()
                                        : sortedTableData().length;
                                  <button
                                    tuiIconButton
                                    type="button"
                                    size="xs"
                                    appearance="flat"
                                    [iconStart]="
                                      visState === 'hidden'
                                        ? '@tui.eye-off'
                                        : visState === 'solo'
                                          ? '@tui.scan-eye'
                                          : '@tui.eye'
                                    "
                                    class="rounded-full! shrink-0 transition-opacity"
                                    [class.opacity-30]="visState === 'hidden'"
                                    [class.opacity-60]="visState === 'visible'"
                                    [class.hover:opacity-100]="
                                      visState === 'visible' ||
                                      visState === 'hidden'
                                    "
                                    [class.opacity-100]="visState === 'solo'"
                                    [class.text-(--tui-text-accent-1)!]="
                                      visState === 'solo'
                                    "
                                    [title]="
                                      (visState === 'hidden'
                                        ? 'showOnly'
                                        : visState === 'solo'
                                          ? 'showAll'
                                          : 'hide'
                                      ) | translate
                                    "
                                    (click.zoneless)="
                                      onToggleRouteVisibility(
                                        item._ref.route_id,
                                        $event
                                      );
                                      $event.stopPropagation()
                                    "
                                  >
                                    {{
                                      (visState === 'hidden'
                                        ? 'showOnly'
                                        : visState === 'solo'
                                          ? 'showAll'
                                          : 'hide'
                                      ) | translate
                                    }}
                                  </button>
                                }
                                <a
                                  tuiLink
                                  [routerLink]="item.link"
                                  class="text-left truncate"
                                >
                                  {{ item.name }}
                                </a>
                              </div>
                              @if (
                                isIndoor() &&
                                !columns().includes('moves') &&
                                item.moves !== undefined
                              ) {
                                <span
                                  class="text-xs opacity-60 shrink-0 font-medium"
                                >
                                  {{ item.moves }} {{ 'moves' | translate }}
                                </span>
                              }
                            </div>
                          }
                          @case ('grade') {
                            <div tuiCell size="m" class="justify-center h-full">
                              <app-grade
                                [grade]="item.grade"
                                [kind]="item._ref.route.climbing_kind"
                              />
                            </div>
                          }
                          @case ('height') {
                            <div tuiCell size="m" class="justify-center h-full">
                              @if (canEdit()) {
                                <tui-textfield
                                  tuiTextfieldSize="s"
                                  [class.w-16!]="!isMobile()"
                                  [class.w-12!]="isMobile()"
                                  class="h-8!"
                                >
                                  <input
                                    #heightInput
                                    tuiInputNumber
                                    class="text-center h-full! border-none! p-0! route-height-input"
                                    [ngModel]="item.height"
                                    (blur.zoneless)="
                                      onUpdateRouteHeight(item._ref, $event)
                                    "
                                    (keydown.enter)="
                                      onUpdateRouteHeight(item._ref, $event);
                                      $event.stopPropagation()
                                    "
                                    (keydown)="onTableKeyDown($event, i)"
                                    autocomplete="off"
                                  />
                                  <span class="tui-textfield__suffix">m</span>
                                </tui-textfield>
                              } @else {
                                {{ item.height ? item.height + 'm' : '-' }}
                              }
                            </div>
                          }
                          @case ('moves') {
                            <div tuiCell size="m" class="justify-center h-full">
                              {{ item.moves ?? '-' }}
                            </div>
                          }
                          @case ('actions') {
                            <div tuiCell size="m" class="justify-center h-full">
                              @if (!item.climbed) {
                                <button
                                  tuiIconButton
                                  size="m"
                                  appearance="neutral"
                                  iconStart="@tui.circle-plus"
                                  class="rounded-full!"
                                  (click.zoneless)="
                                    onLogAscent(item._ref);
                                    $event.stopPropagation()
                                  "
                                >
                                  {{ 'ascent.new' | translate }}
                                </button>
                              } @else if (
                                item._ref.route.own_ascent;
                                as ascentToEdit
                              ) {
                                <span
                                  tuiAvatar
                                  class="cursor-pointer text-(--tui-text-primary-on-accent-1)!"
                                  [style.background]="
                                    (ascentToEdit?.type | ascentInfo).background
                                  "
                                  tabindex="0"
                                  (click.zoneless)="
                                    onViewAscent(ascentToEdit);
                                    $event.stopPropagation()
                                  "
                                  (keydown.enter)="
                                    onViewAscent(ascentToEdit);
                                    $event.stopPropagation()
                                  "
                                >
                                  <tui-icon
                                    [icon]="
                                      (ascentToEdit?.type | ascentInfo).icon
                                    "
                                  />
                                </span>
                              }
                              @if (!item.climbed && !isIndoor()) {
                                <button
                                  tuiIconButton
                                  size="m"
                                  [appearance]="
                                    item.project ? 'info' : 'neutral'
                                  "
                                  iconStart="@tui.bookmark"
                                  class="rounded-full!"
                                  (click.zoneless)="
                                    onToggleProject(item);
                                    $event.stopPropagation()
                                  "
                                >
                                  {{ 'project' | translate }}
                                </button>
                              }
                            </div>
                          }
                          @case ('admin_actions') {
                            <div tuiCell size="m" class="justify-center h-full">
                              @if (canEdit()) {
                                <button
                                  tuiIconButton
                                  size="s"
                                  appearance="negative"
                                  iconStart="@tui.unlink"
                                  class="rounded-full!"
                                  (click.zoneless)="
                                    deleteTopoRoute(item._ref);
                                    $event.stopPropagation()
                                  "
                                >
                                  {{ 'unlink' | translate }}
                                </button>
                              }
                            </div>
                          }
                        }
                      </td>
                    }
                  </tr>
                </tbody>
              }
            </table>
          } @else {
            <app-empty-state icon="@tui.route" />
          }
        } @else {
          <div class="flex h-full items-center justify-center p-4">
            <app-paywall
              [areaId]="areaId()"
              [price]="areaPrice()"
              [hideTitle]="true"
            />
          </div>
        }
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoRoutesTableComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly routesService = inject(RoutesService);
  private readonly supabase = inject(SupabaseService);
  private readonly toposService = inject(ToposService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly indoorData = inject(IndoorDataService);

  sortedTableData = input.required<TopoRouteRow[]>();
  columns = input.required<string[]>();
  canEdit = input(false);
  isMobile = input(false);
  selectedRouteId = input<string | number | null>(null);
  hasAccess = input(false);
  isIndoor = input(false);
  direction = input<TuiSortDirection>(TuiSortDirection.Asc);
  sorter = input.required<TuiComparator<TopoRouteRow>>();
  topoId = input.required<string | number>();
  areaId = input(0);
  areaPrice = input(0);
  hiddenRouteIds = input<Set<string | number>>(new Set());

  selectedRouteIdChange = output<string | number | null>();
  hoveredRouteIdChange = output<string | number | null>();
  sortChange = output<TuiTableSortChange<TopoRouteRow>>();
  toggleRouteVisibility = output<{
    routeId: string | number;
    isAlt?: boolean;
  }>();

  protected readonly indexInputs =
    viewChildren<ElementRef<HTMLInputElement>>('indexInput');
  protected readonly heightInputs =
    viewChildren<ElementRef<HTMLInputElement>>('heightInput');

  constructor() {
    effect(() => {
      const routeId = this.selectedRouteId();
      if (!routeId) return;
      queueMicrotask(() => {
        const row = document.getElementById(
          `route-row-${this.topoId()}-${routeId}`,
        );
        if (!row) return;
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  protected selectRoute(routeId: string | number): void {
    this.selectedRouteIdChange.emit(
      this.selectedRouteId() === routeId ? null : routeId,
    );
  }

  protected onSortChange(event: TuiTableSortChange<TopoRouteRow>): void {
    this.sortChange.emit(event);
  }

  protected onToggleRouteVisibility(
    routeId: string | number,
    event: Event,
  ): void {
    const isAlt = event instanceof MouseEvent ? event.altKey : false;
    this.toggleRouteVisibility.emit({ routeId, isAlt });
  }

  protected onLogAscent(tr: TopoRouteWithRoute): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: tr.route.id,
        routeName: tr.route.name,
        grade: tr.route.grade,
        climbingKind: tr.route.climbing_kind,
        isIndoor: this.isIndoor(),
      }),
      { defaultValue: undefined },
    );
  }

  protected onViewAscent(
    ascent: NonNullable<TopoRouteRow['_ref']['route']['own_ascent']>,
  ): void {
    this.ascentsService.viewAscent(ascent.id);
  }

  protected async onToggleProject(item: TopoRouteRow): Promise<void> {
    const routeToSync = {
      ...item._ref.route,
      id: item._ref.route.id as number,
      project: !!item._ref.route.project,
    };
    await this.routesService.toggleRouteProject(
      item._ref.route_id as number,
      routeToSync,
    );
  }

  protected onUpdateRouteNumber(item: TopoRouteRow, event: Event): void {
    const tr = item._ref;
    const inputEl = event.target as HTMLInputElement;
    const newNumber = inputEl.value;
    const val =
      typeof newNumber === 'string' ? parseInt(newNumber, 10) : newNumber;

    const currentDisplayVal = item.index + 1;
    if (val === null || isNaN(val) || val < 1 || val === currentDisplayVal) {
      inputEl.value = String(currentDisplayVal);
      return;
    }

    const targetDbNumber = Math.max(0, val - 1);
    const topoId = String(this.topoId() || tr.topo_id);

    if (this.isIndoor()) {
      this.supabase.client
        .from('indoor_topo_routes')
        .update({ number: targetDbNumber })
        .eq('topo_id', topoId)
        .eq('route_id', String(tr.route_id))
        .then(({ error }) => {
          if (error) {
            handleErrorToast(error, this.toast);
          } else {
            this.indoorData.topoDetailResource.reload();
            this.toast.success('messages.toasts.routeUpdated');
          }
        });
      return;
    }

    this.toposService
      .updateRouteOrder(topoId, tr.route_id, targetDbNumber)
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected onUpdateRouteHeight(tr: TopoRouteWithRoute, event: Event): void {
    const newHeight = (event.target as HTMLInputElement).value;
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;
    if (val === tr.route?.height) return;
    this.routesService
      .update(tr.route_id as number, { height: val })
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected deleteTopoRoute(topoRoute: TopoRouteWithRoute): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.removeRouteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.removeRouteConfirm', {
            name: topoRoute.route.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      if (this.isIndoor()) {
        this.supabase.client
          .from('indoor_topo_routes')
          .delete()
          .eq('topo_id', String(topoRoute.topo_id))
          .eq('route_id', String(topoRoute.route_id))
          .then(({ error }) => {
            if (error) {
              handleErrorToast(error, this.toast);
            } else {
              this.toast.showWithUndo('messages.toasts.routeRemoved', () => {
                this.supabase.client
                  .from('indoor_topo_routes')
                  .insert({
                    topo_id: String(topoRoute.topo_id),
                    route_id: String(topoRoute.route_id),
                    number: Number(topoRoute.number || 0),
                    path: topoPathToJson(topoRoute.path),
                  })
                  .then(({ error: undoError }) => {
                    if (undoError) {
                      handleErrorToast(undoError, this.toast);
                    } else {
                      this.indoorData.topoDetailResource.reload();
                    }
                  });
              });
              this.indoorData.topoDetailResource.reload();
            }
          });
      } else {
        this.toposService
          .removeRoute(topoRoute.topo_id, topoRoute.route_id, false)
          .then(() => {
            this.toast.showWithUndo('messages.toasts.routeRemoved', () => {
              void this.toposService.addRoute({
                topo_id: Number(topoRoute.topo_id),
                route_id: Number(topoRoute.route_id),
                number: 0,
              });
            });
            this.outdoorData.topoDetailResource.reload();
          })
          .catch((err) => handleErrorToast(err, this.toast));
      }
    });
  }

  protected onTableKeyDown(event: KeyboardEvent, index?: number): void {
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT';
    if ((target.tagName === 'TEXTAREA' || target.isContentEditable) && !isInput)
      return;
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const data = this.sortedTableData();
      if (data.length === 0) return;
      const step = event.key === 'ArrowUp' ? -1 : 1;
      let nextItem: TopoRouteRow | undefined;
      let nextIdx: number | undefined;
      if (isInput) {
        if (index !== undefined) {
          nextIdx = (index + step + data.length) % data.length;
        } else {
          const tr = target.closest('tr');
          const rowIdAttr = tr?.getAttribute('id') || '';
          const match = rowIdAttr.match(/route-row-(\d+)-(\d+)/);
          if (match) {
            const routeId = parseInt(match[2], 10);
            const currentIndex = data.findIndex(
              (item) => item?._ref?.route_id === routeId,
            );
            if (currentIndex !== -1) {
              nextIdx = (currentIndex + step + data.length) % data.length;
            }
          }
        }
        if (nextIdx !== undefined) {
          nextItem = data[nextIdx];
          if (nextItem?._ref) {
            event.preventDefault();
            this.selectedRouteIdChange.emit(nextItem._ref.route_id);
            const inputClass = target.classList.contains('route-index-input')
              ? '.route-index-input'
              : '.route-height-input';
            const inputs =
              inputClass === '.route-index-input'
                ? this.indexInputs()
                : this.heightInputs();
            const nextInput = inputs[nextIdx!];
            if (nextInput?.nativeElement) {
              nextInput.nativeElement.focus();
              nextInput.nativeElement.select();
            }
          }
        }
        return;
      }
      const currentId = this.selectedRouteId();
      let nextIndex = 0;
      if (currentId) {
        const currentIndex = data.findIndex(
          (item) => item?._ref?.route_id === currentId,
        );
        if (currentIndex !== -1) {
          nextIndex = (currentIndex + step + data.length) % data.length;
        }
      }
      nextItem = data[nextIndex];
      if (nextItem?._ref) {
        this.selectedRouteIdChange.emit(nextItem._ref.route_id);
        event.preventDefault();
      }
    }
  }
}
