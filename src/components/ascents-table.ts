import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  Input,
  InputSignal,
  output,
  Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTablePagination,
  type TuiTablePaginationEvent,
  tuiTablePaginationOptionsProvider,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import {
  TuiFallbackSrcPipe,
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiAvatar, TuiChip, TuiRating } from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  AscentType,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { AscentsService, GlobalData, SupabaseService } from '../services';

import { AscentCommentsComponent } from './ascent-comments';
import { AscentLikesComponent } from './ascent-likes';
import { AvatarGradeComponent } from './avatar-grade';
import { EmptyStateComponent } from './empty-state';

export interface AscentsTableRow {
  key: string;
  user_name: string;
  user_avatar: string | null;
  user_id: string;
  route_name: string;
  route_slug: string;
  area_slug: string;
  crag_slug: string;
  area_name: string;
  crag_name: string;
  grade: string;
  date: string;
  rating: number;
  type: AscentType | '';
  comment: string;
  showComment: boolean;
  details: string[];
  avatarSrc: string;
  canEdit: boolean;
  liked: boolean;
  likes_count: number;
  user_liked: boolean;
  _ref: RouteAscentWithExtras;
}

@Component({
  selector: 'app-ascents-table',
  imports: [
    CommonModule,
    RouterLink,
    TuiAvatar,
    TuiRating,
    TuiChip,
    TranslatePipe,
    TuiTable,
    TuiCell,
    FormsModule,
    TuiHint,
    TuiTableSortPipe,
    TuiTablePagination,
    TuiFallbackSrcPipe,
    TuiScrollbar,
    AsyncPipe,
    TuiIcon,
    TuiLink,
    AscentLikesComponent,
    AscentCommentsComponent,
    AvatarGradeComponent,
    EmptyStateComponent,
  ],
  template: `
    @let data = tableData();
    @if (data.length > 0) {
      <tui-scrollbar class="grow min-h-0 no-scrollbar">
        <table
          tuiTable
          class="w-full"
          [columns]="columns()"
          [direction]="direction"
          [sorter]="tableSorter"
          (sortChange)="onSortChange($event)"
        >
          <thead tuiThead>
            <tr tuiThGroup>
              @for (col of columns(); track col) {
                <th
                  *tuiHead="col"
                  tuiTh
                  [sorter]="getSorter(col)"
                  [class.text-right]="col === 'likes'"
                >
                  {{
                    col === 'actions' || col === 'details' || col === 'likes'
                      ? ''
                      : ('labels.' + (col === 'route' ? 'grade' : col)
                        | translate)
                  }}
                </th>
              }
            </tr>
          </thead>
          @let sortedData = data | tuiTableSort;
          <tbody tuiTbody [data]="sortedData">
            @for (item of sortedData; track item.key) {
              <tr
                tuiTr
                [class.cursor-pointer]="item.canEdit"
                [style.background]="
                  showRowColors() && item.canEdit
                    ? ascentsService.ascentInfo()[item.type || 'default']
                        .backgroundSubtle
                    : ''
                "
                (click.zoneless)="item.canEdit && onEdit(item)"
              >
                @for (col of columns(); track col) {
                  <td
                    *tuiCell="col"
                    tuiTd
                    [class.text-right]="col === 'likes'"
                  >
                    @switch (col) {
                      @case ('user') {
                        <div tuiCell size="m" class="flex items-center">
                          <a
                            [routerLink]="['/profile', item.user_id]"
                            (click)="$event.stopPropagation()"
                          >
                            <tui-avatar
                              size="m"
                              [src]="
                                item.avatarSrc
                                  | tuiFallbackSrc: '@tui.user'
                                  | async
                              "
                            />
                          </a>
                          <a
                            tuiLink
                            [routerLink]="['/profile', item.user_id]"
                            (click)="$event.stopPropagation()"
                          >
                            {{ item.user_name }}
                          </a>
                        </div>
                      }
                      @case ('route') {
                        <div
                          tuiCell
                          size="m"
                          class="!flex-row !gap-2 !items-center"
                        >
                          <app-avatar-grade
                            [grade]="
                              item._ref.grade ?? item._ref.route?.grade ?? 0
                            "
                            size="s"
                          />
                          <div class="flex flex-col min-w-0">
                            <a
                              tuiLink
                              [routerLink]="[
                                '/area',
                                item.area_slug,
                                item.crag_slug,
                                item.route_slug,
                              ]"
                              class="align-self-start whitespace-nowrap font-bold text-base line-clamp-1"
                              [style.color]="
                                item.liked ? 'var(--tui-status-negative)' : ''
                              "
                              (click)="$event.stopPropagation()"
                            >
                              {{ item.route_name }}
                            </a>
                            <div
                              class="text-xs opacity-70 flex gap-1 items-center whitespace-nowrap"
                            >
                              <a
                                tuiLink
                                [routerLink]="['/area', item.area_slug]"
                                (click)="$event.stopPropagation()"
                              >
                                {{ item.area_name }}
                              </a>
                              <span>/</span>
                              <a
                                tuiLink
                                [routerLink]="[
                                  '/area',
                                  item.area_slug,
                                  item.crag_slug,
                                ]"
                                (click)="$event.stopPropagation()"
                              >
                                {{ item.crag_name }}
                              </a>
                            </div>
                          </div>
                        </div>
                      }
                      @case ('grade') {
                        <div tuiCell size="m">
                          <app-avatar-grade
                            [grade]="
                              item._ref.grade ?? item._ref.route?.grade ?? 0
                            "
                            size="m"
                          />
                        </div>
                      }
                      @case ('date') {
                        <div tuiCell size="m">
                          {{ item.date | date: 'dd/MM/yyyy' }}
                        </div>
                      }
                      @case ('rating') {
                        <div tuiCell size="m">
                          <tui-rating
                            [max]="5"
                            [ngModel]="item.rating"
                            [readOnly]="true"
                            [style.font-size.rem]="0.5"
                          />
                        </div>
                      }
                      @case ('comment') {
                        <div tuiCell size="m" class="text-sm italic opacity-80">
                          @if (item.showComment || item.canEdit) {
                            {{ item.comment }}
                          }
                        </div>
                      }
                      @case ('details') {
                        <div tuiCell size="m" class="flex flex-wrap gap-1">
                          @for (tag of item.details; track tag) {
                            <tui-chip size="xxs">
                              {{ tag | translate }}
                            </tui-chip>
                          }
                        </div>
                      }
                      @case ('type') {
                        <div tuiCell size="m">
                          <tui-avatar
                            class="!text-white"
                            [style.background]="
                              ascentsService.ascentInfo()[
                                item.type || 'default'
                              ].background
                            "
                            [tuiHint]="
                              global.isMobile()
                                ? null
                                : ('ascentTypes.' + (item.type || 'rp')
                                  | translate)
                            "
                          >
                            <tui-icon
                              [icon]="
                                ascentsService.ascentInfo()[
                                  item.type || 'default'
                                ].icon
                              "
                            />
                          </tui-avatar>
                        </div>
                      }
                      @case ('likes') {
                        <div tuiCell size="m" class="flex items-center gap-1">
                          <app-ascent-likes [ascentId]="item._ref.id" />
                          <app-ascent-comments [ascentId]="item._ref.id" />
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
    } @else {
      <app-empty-state />
    }
    @if (total() > 0) {
      <tui-table-pagination
        [total]="total()"
        [page]="page()"
        [size]="size()"
        (paginationChange)="paginationChange.emit($event)"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    tuiTablePaginationOptionsProvider({
      sizeOptionContent: ({ $implicit, total }) => {
        switch ($implicit) {
          case total:
            return 'Show all rows';
          default:
            return $implicit;
        }
      },
    }),
  ],
  host: { class: 'flex flex-col min-h-0' },
})
export class AscentsTableComponent {
  protected readonly global = inject(GlobalData);
  protected readonly ascentsService = inject(AscentsService);
  private readonly supabase = inject(SupabaseService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  data: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();

  total: InputSignal<number> = input<number>(0);
  page: InputSignal<number> = input<number>(0);
  size: InputSignal<number> = input<number>(10);

  paginationChange = output<TuiTablePaginationEvent>();
  direction: TuiSortDirection = TuiSortDirection.Desc;
  @Input() set initialDirection(v: TuiSortDirection) {
    this.direction = v;
  }
  showUser: InputSignal<boolean> = input(true);
  showRoute: InputSignal<boolean> = input(true);
  showRowColors: InputSignal<boolean> = input(true);

  readonly columns = computed(() => {
    const cols: string[] = [];
    const isMobile = this.global.isMobile();
    if (this.showUser()) cols.push('user');
    if (this.showRoute()) {
      cols.push('route');
    } else {
      cols.push('grade');
    }
    if (!isMobile) {
      cols.push('date', 'type', 'comment', 'details', 'rating');
    }
    cols.push('likes');
    return cols;
  });

  readonly tableData: Signal<AscentsTableRow[]> = computed(() => {
    return this.data().map((a) => {
      const g = VERTICAL_LIFE_TO_LABEL[a.grade as VERTICAL_LIFE_GRADES] ?? '?';
      const details: string[] = [];
      if (a.soft) details.push('ascent.soft');
      if (a.hard) details.push('ascent.hard');
      if (a.first_ascent) details.push('ascent.other.first_ascent');
      if (a.traditional) details.push('ascent.other.traditional');
      if (a.no_score) details.push('ascent.other.no_score');
      if (a.chipped) details.push('ascent.other.chipped');
      if (a.recommended) details.push('ascent.recommend');

      // Climbing
      if (a.cruxy) details.push('ascent.climbing.cruxy');
      if (a.athletic) details.push('ascent.climbing.athletic');
      if (a.sloper) details.push('ascent.climbing.sloper');
      if (a.endurance) details.push('ascent.climbing.endurance');
      if (a.technical) details.push('ascent.climbing.technical');
      if (a.crimpy) details.push('ascent.climbing.crimpy');

      // Steepness
      if (a.slab) details.push('ascent.steepness.slab');
      if (a.vertical) details.push('ascent.steepness.vertical');
      if (a.overhang) details.push('ascent.steepness.overhang');
      if (a.roof) details.push('ascent.steepness.roof');

      // Safety
      if (a.bad_anchor) details.push('ascent.safety.bad_anchor');
      if (a.bad_bolts) details.push('ascent.safety.bad_bolts');
      if (a.high_first_bolt) details.push('ascent.safety.high_first_bolt');
      if (a.lose_rock) details.push('ascent.safety.lose_rock');
      if (a.bad_clipping_position)
        details.push('ascent.safety.bad_clipping_position');

      // Other
      if (a.with_kneepad) details.push('ascent.other.with_kneepad');

      return {
        key: a.id.toString(),
        user_name: a.user?.name ?? 'Anonymous',
        user_avatar: a.user?.avatar ?? null,
        user_id: a.user_id,
        route_name: a.route?.name ?? 'Unknown',
        route_slug: a.route?.slug ?? '',
        area_name: a.route?.area_name ?? '',
        crag_name: a.route?.crag_name ?? '',
        area_slug: a.route?.area_slug ?? '',
        crag_slug: a.route?.crag_slug ?? '',
        grade: g,
        date: a.date ?? a.created_at ?? '',
        rating: a.rate ?? 0,
        type: a.type ?? '',
        comment: a.comment ?? '',
        showComment: !a.private_comment,
        details,
        canEdit: a.user_id === this.supabase.authUser()?.id,
        liked: a.route?.liked ?? false,
        likes_count: a.likes_count ?? 0,
        user_liked: !!a.user_liked,
        avatarSrc: this.supabase.buildAvatarUrl(a.user?.avatar ?? null),
        _ref: a,
      };
    });
  });

  protected readonly sorters: Record<string, TuiComparator<AscentsTableRow>> = {
    user: (a, b) => tuiDefaultSort(a.user_name, b.user_name),
    route: (a, b) =>
      tuiDefaultSort(
        a._ref.grade ?? a._ref.route?.grade ?? 0,
        b._ref.grade ?? b._ref.route?.grade ?? 0,
      ),
    grade: (a, b) =>
      tuiDefaultSort(
        a._ref.grade ?? a._ref.route?.grade ?? 0,
        b._ref.grade ?? b._ref.route?.grade ?? 0,
      ),
    date: (a, b) => tuiDefaultSort(a.date, b.date),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    type: (a, b) => tuiDefaultSort(a.type, b.type),
  };

  protected tableSorter: TuiComparator<AscentsTableRow> = this.sorters['date'];

  protected getSorter(col: string): TuiComparator<AscentsTableRow> | null {
    return this.sorters[col] ?? null;
  }

  protected onSortChange(sort: TuiTableSortChange<AscentsTableRow>): void {
    this.tableSorter = sort.sortComparator || this.sorters['date'];
    this.direction = sort.sortDirection;
  }

  protected onEdit(item: AscentsTableRow): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: item._ref.route_id,
        routeName: item.route_name,
        ascentData: item._ref,
      }),
    );
  }
}
