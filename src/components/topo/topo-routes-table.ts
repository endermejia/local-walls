import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiInputNumber,
} from '@taiga-ui/kit';
import {
  TuiButton,
  TuiIcon,
  TuiLink,
  TuiTextfield,
  TuiScrollbar,
  TuiCell,
} from '@taiga-ui/core';
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
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import type { TuiTableSortChange } from '@taiga-ui/addon-table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AscentsService } from '../../services/ascents.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import { PaywallComponent } from '../paywall/paywall';
import { AscentInfoPipe } from '../../pipes/ascent-info.pipe';
import { TableSorterPipe } from '../../pipes/table-sorter.pipe';
import { handleErrorToast } from '../../utils';
import type { TopoRouteRow } from './topo.types';
import type { TopoRouteWithRoute } from '../../models';

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
                          (col === 'actions' || col === 'admin_actions')) ||
                        (!isMobile() &&
                          (col === 'height' || col === 'admin_actions'))
                      "
                      [class.w-28!]="!isMobile() && col === 'actions'"
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
                                    class="text-center h-full! border-none! p-0! route-index-input"
                                    [ngModel]="item.index + 1"
                                    (blur.zoneless)="
                                      onUpdateRouteNumber(item._ref, $event)
                                    "
                                    (keydown.enter)="
                                      onUpdateRouteNumber(item._ref, $event);
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
                            <div tuiCell size="m" class="h-full">
                              <a
                                tuiLink
                                [routerLink]="item.link"
                                class="text-left"
                              >
                                {{ item.name }}
                              </a>
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
                                    onEditAscent(ascentToEdit, item.name);
                                    $event.stopPropagation()
                                  "
                                  (keydown.enter)="
                                    onEditAscent(ascentToEdit, item.name);
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

  sortedTableData = input.required<TopoRouteRow[]>();
  columns = input.required<string[]>();
  canEdit = input(false);
  isMobile = input(false);
  selectedRouteId = input<number | null>(null);
  hasAccess = input(false);
  isIndoor = input(false);
  direction = input<TuiSortDirection>(TuiSortDirection.Asc);
  sorter = input.required<TuiComparator<TopoRouteRow>>();
  topoId = input.required<string | number>();
  areaId = input(0);
  areaPrice = input(0);

  selectedRouteIdChange = output<number | null>();
  hoveredRouteIdChange = output<number | null>();
  sortChange = output<TuiTableSortChange<TopoRouteRow>>();

  protected readonly indexInputs =
    viewChildren<ElementRef<HTMLInputElement>>('indexInput');
  protected readonly heightInputs =
    viewChildren<ElementRef<HTMLInputElement>>('heightInput');

  protected selectRoute(routeId: number): void {
    this.selectedRouteIdChange.emit(
      this.selectedRouteId() === routeId ? null : routeId,
    );
  }

  protected onSortChange(event: TuiTableSortChange<TopoRouteRow>): void {
    this.sortChange.emit(event);
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

  protected onEditAscent(
    ascent: NonNullable<TopoRouteRow['_ref']['route']['own_ascent']>,
    routeName?: string,
  ): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
        isIndoor: this.isIndoor(),
      }),
      { defaultValue: undefined },
    );
  }

  protected async onToggleProject(item: TopoRouteRow): Promise<void> {
    const routeToSync = {
      ...item._ref.route,
      project: !!item._ref.route.project,
    };
    await this.routesService.toggleRouteProject(
      item._ref.route_id,
      routeToSync,
    );
  }

  protected onUpdateRouteNumber(tr: TopoRouteWithRoute, event: Event): void {
    const newNumber = (event.target as HTMLInputElement).value;
    const val =
      typeof newNumber === 'string' ? parseInt(newNumber, 10) : newNumber;
    if (val === null || isNaN(val) || val === tr.number) return;
    if (this.isIndoor()) {
      this.supabase.client
        .from('indoor_topo_routes')
        .update({ number: val })
        .eq('topo_id', String(tr.topo_id))
        .eq('route_id', String(tr.route_id))
        .then(({ error }) => {
          if (error) handleErrorToast(error, this.toast);
        });
      return;
    }
    this.toposService
      .updateRouteOrder(tr.topo_id, tr.route_id, val - 1)
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
      .update(tr.route_id, { height: val })
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
            if (error) handleErrorToast(error, this.toast);
          });
      } else {
        this.toposService
          .removeRoute(topoRoute.topo_id, topoRoute.route_id)
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
