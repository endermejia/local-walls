import { firstValueFrom } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  Signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAvatar, TuiRating, TuiChip } from '@taiga-ui/kit';
import { TuiTable, TuiTableSortPipe } from '@taiga-ui/addon-table';
import { TuiCell } from '@taiga-ui/layout';
import { TuiIcon, TuiHint, TuiFallbackSrcPipe, TuiLink } from '@taiga-ui/core';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { SupabaseService, GlobalData, AscentsService } from '../services';
import { AvatarGradeComponent } from './avatar-grade';
import { EmptyStateComponent } from './empty-state';
import {
  RouteAscentWithExtras,
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
} from '../models';

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
  type: string;
  comment: string;
  showComment: boolean;
  details: string[];
  avatarSrc: string;
  canEdit: boolean;
  liked: boolean;
  _ref: RouteAscentWithExtras;
}

@Component({
  selector: 'app-ascents-table',
  standalone: true,
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
    TuiFallbackSrcPipe,
    AsyncPipe,
    TuiIcon,
    TuiLink,
    AvatarGradeComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="overflow-auto">
      <table
        tuiTable
        class="w-full"
        [columns]="columns()"
        [sorter]="tableSorter"
      >
        <thead tuiThead>
          <tr tuiThGroup>
            @for (col of columns(); track col) {
              <th *tuiHead="col" tuiTh [sorter]="getSorter(col)">
                {{
                  col === 'actions' || col === 'details'
                    ? ''
                    : ('labels.' + col | translate)
                }}
              </th>
            }
          </tr>
        </thead>
        @let sortedData = tableData() | tuiTableSort;
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
                <td *tuiCell="col" tuiTd>
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
                            class="cursor-pointer"
                          />
                        </a>
                        <a
                          [routerLink]="['/profile', item.user_id]"
                          tuiLink
                          (click)="$event.stopPropagation()"
                        >
                          {{ item.user_name }}
                        </a>
                      </div>
                    }
                    @case ('route') {
                      <div tuiCell size="m">
                        <div class="flex flex-col">
                          <a
                            tuiLink
                            [routerLink]="[
                              '/area',
                              item.area_slug,
                              item.crag_slug,
                              item.route_slug,
                            ]"
                            class="align-self-start whitespace-nowrap font-bold text-base"
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
                            ascentsService.ascentInfo()[item.type || 'default']
                              .background
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
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr tuiTr>
              <td [attr.colspan]="columns().length" tuiTd>
                <app-empty-state />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentsTableComponent {
  private readonly supabase = inject(SupabaseService);
  protected readonly global = inject(GlobalData);
  protected readonly ascentsService = inject(AscentsService);

  data: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();
  showUser: InputSignal<boolean> = input(true);
  showRoute: InputSignal<boolean> = input(true);
  showRowColors: InputSignal<boolean> = input(true);

  deleted = output<number>();
  updated = output<void>();

  readonly columns = computed(() => {
    const cols = [];
    if (this.showUser()) cols.push('user');
    cols.push('grade');
    if (this.showRoute()) cols.push('route');
    cols.push('date', 'rating', 'comment', 'details', 'type');
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
        avatarSrc: this.supabase.buildAvatarUrl(a.user?.avatar ?? null),
        _ref: a,
      };
    });
  });

  protected readonly sorters: Record<string, TuiComparator<AscentsTableRow>> = {
    user: (a, b) => tuiDefaultSort(a.user_name, b.user_name),
    route: (a, b) => tuiDefaultSort(a.route_name, b.route_name),
    grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
    date: (a, b) => tuiDefaultSort(a.date, b.date),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    type: (a, b) => tuiDefaultSort(a.type, b.type),
  };

  protected readonly tableSorter: TuiComparator<AscentsTableRow> =
    this.sorters['date'];

  protected getSorter(col: string): TuiComparator<AscentsTableRow> | null {
    return this.sorters[col] ?? null;
  }

  protected onEdit(item: AscentsTableRow): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: item._ref.route_id,
        routeName: item.route_name,
        ascentData: item._ref,
      }),
    ).then((success) => {
      if (success) {
        this.updated.emit();
      }
    });
  }
}
