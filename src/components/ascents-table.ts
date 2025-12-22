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
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { firstValueFrom } from 'rxjs';
import {
  TuiButton,
  TuiIcon,
  TuiHint,
  TuiFallbackSrcPipe,
  TuiDialogService,
} from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import AscentFormComponent from '../pages/ascent-form';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import {
  RouteAscentWithExtras,
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  colorForGrade,
  GradeLabel,
} from '../models';
import { SupabaseService, GlobalData, AscentsService } from '../services';

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
  grade_color: string;
  date: string;
  rating: number;
  type: string;
  comment: string;
  showComment: boolean;
  details: string[];
  editDisabled: boolean;
  avatarSrc: string;
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
    TuiButton,
    TuiIcon,
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
            <tr tuiTr>
              @for (col of columns(); track col) {
                <td *tuiCell="col" tuiTd>
                  @switch (col) {
                    @case ('user') {
                      <div tuiCell size="m" class="flex items-center gap-2">
                        <tui-avatar
                          size="s"
                          [src]="
                            item.avatarSrc | tuiFallbackSrc: '@tui.user' | async
                          "
                        />
                        <a
                          [routerLink]="['/profile', item.user_id]"
                          class="tui-link"
                        >
                          {{ item.user_name }}
                        </a>
                      </div>
                    }
                    @case ('route') {
                      <div tuiCell size="m">
                        <div class="flex flex-col">
                          <a
                            [routerLink]="[
                              '/area',
                              item.area_slug,
                              item.crag_slug,
                              item.route_slug,
                            ]"
                            class="tui-link font-medium align-self-start"
                          >
                            {{ item.route_name }}
                          </a>
                          <div
                            class="text-xs opacity-70 flex gap-1 items-center"
                          >
                            <a
                              [routerLink]="['/area', item.area_slug]"
                              class="tui-link hover:underline "
                            >
                              {{ item.area_name }}
                            </a>
                            <span>/</span>
                            <a
                              [routerLink]="[
                                '/area',
                                item.area_slug,
                                item.crag_slug,
                              ]"
                              class="tui-link hover:underline"
                            >
                              {{ item.crag_name }}
                            </a>
                          </div>
                        </div>
                      </div>
                    }
                    @case ('grade') {
                      <div tuiCell size="m">
                        <tui-avatar
                          size="s"
                          class="font-semibold select-none !text-white"
                          [style.background]="item.grade_color"
                        >
                          {{ item.grade }}
                        </tui-avatar>
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
                        @if (item.showComment) {
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
                        <button
                          size="s"
                          [appearance]="
                            ascentInfo()[item.type || 'default'].appearance
                          "
                          tuiIconButton
                          type="button"
                          class="!rounded-full"
                          [tuiHint]="
                            (item.editDisabled
                              ? 'ascentTypes.' + (item.type || 'rp')
                              : 'ascent.edit'
                            ) | translate
                          "
                          (click.zoneless)="onEdit(item)"
                          [disabled]="item.editDisabled"
                        >
                          <tui-icon
                            [icon]="ascentInfo()[item.type || 'default'].icon"
                          />
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentsTableComponent {
  private readonly supabase = inject(SupabaseService);
  protected readonly global = inject(GlobalData);
  private readonly ascentsService = inject(AscentsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  data: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();
  showUser: InputSignal<boolean> = input(true);
  showRoute: InputSignal<boolean> = input(true);

  deleted = output<number>();
  updated = output<void>();

  readonly columns = computed(() => {
    const cols = ['grade'];
    if (this.showUser()) cols.push('user');
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
      if (a.first_ascent) details.push('ascent.firstAscent');
      if (a.traditional) details.push('ascent.traditional');
      if (a.no_score) details.push('ascent.noScore');
      if (a.chipped) details.push('ascent.chipped');
      if (a.recommended) details.push('ascent.recommend');
      // Add more if needed based on models props: cruxy, athletic, etc? User said "soft, hard, etc."

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
        grade_color:
          g !== '?'
            ? colorForGrade(g as GradeLabel)
            : 'var(--tui-text-primary)',
        date: a.date ?? a.created_at ?? '',
        rating: a.rate ?? 0,
        type: a.type ?? '',
        comment: a.comment ?? '',
        showComment: !a.private_comment,
        details,
        editDisabled:
          a.user_id !== this.supabase.authUser()?.id && !this.global.isAdmin(),
        avatarSrc: this.supabase.buildAvatarUrl(a.user?.avatar ?? null),
        _ref: a,
      };
    });
  });

  protected readonly ascentInfo = computed<
    Record<string, { icon: string; appearance: string }>
  >(() => ({
    os: {
      icon: '@tui.eye',
      appearance: 'success',
    },
    f: {
      icon: '@tui.zap',
      appearance: 'warning',
    },
    rp: {
      icon: '@tui.circle',
      appearance: 'negative',
    },
    default: {
      icon: '@tui.circle',
      appearance: 'neutral',
    },
  }));

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
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('actions.edit'),
        data: { ascentData: item._ref },
        size: 'm',
      })
      .subscribe((success) => {
        if (success) {
          this.updated.emit();
        }
      });
  }

  protected async onDelete(item: AscentsTableRow): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('actions.delete'),
        size: 'm',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: `${item.route_name} (${item.date})`,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
    );

    if (!confirmed) return;

    try {
      const id = Number(item.key);
      await this.ascentsService.delete(id);
      this.deleted.emit(id);
    } catch (e) {
      console.error('Error deleting ascent', e);
    }
  }
}
